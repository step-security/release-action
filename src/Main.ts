import * as github from "@actions/github"
import * as core from "@actions/core"
import * as fs from "fs"
import { CoreInputs } from "./Inputs.js"
import { GithubReleases } from "./Releases.js"
import { Action } from "./Action.js"
import { GithubArtifactUploader } from "./ArtifactUploader.js"
import { FileArtifactGlobber } from "./ArtifactGlobber.js"
import { GithubError } from "./GithubError.js"
import { CoreOutputs } from "./Outputs.js"
import { GithubArtifactDestroyer } from "./ArtifactDestroyer.js"
import { ReleaseActionSkipper } from "./ActionSkipper.js"
import axios, { isAxiosError } from "axios"

async function validateSubscription(): Promise<void> {
    const eventPath = process.env.GITHUB_EVENT_PATH
    let repoPrivate: boolean | undefined

    if (eventPath && fs.existsSync(eventPath)) {
        const eventData = JSON.parse(fs.readFileSync(eventPath, "utf8"))
        repoPrivate = eventData?.repository?.private
    }

    const upstream = "ncipollo/release-action"
    const action = process.env.GITHUB_ACTION_REPOSITORY
    const docsUrl = "https://docs.stepsecurity.io/actions/stepsecurity-maintained-actions"

    core.info("")
    core.info("\u001b[1;36mStepSecurity Maintained Action\u001b[0m")
    core.info(`Secure drop-in replacement for ${upstream}`)
    if (repoPrivate === false) core.info("\u001b[32m\u2713 Free for public repositories\u001b[0m")
    core.info(`\u001b[36mLearn more:\u001b[0m ${docsUrl}`)
    core.info("")

    if (repoPrivate === false) return

    const serverUrl = process.env.GITHUB_SERVER_URL || "https://github.com"
    const body: Record<string, string> = { action: action || "" }
    if (serverUrl !== "https://github.com") body.ghes_server = serverUrl
    try {
        await axios.post(
            `https://agent.api.stepsecurity.io/v1/github/${process.env.GITHUB_REPOSITORY}/actions/maintained-actions-subscription`,
            body,
            { timeout: 3000 }
        )
    } catch (error) {
        if (isAxiosError(error) && error.response?.status === 403) {
            core.error(
                `\u001b[1;31mThis action requires a StepSecurity subscription for private repositories.\u001b[0m`
            )
            core.error(`\u001b[31mLearn how to enable a subscription: ${docsUrl}\u001b[0m`)
            process.exit(1)
        }
        core.info("Timeout or API not reachable. Continuing to next step.")
    }
}

async function run() {
    try {
        await validateSubscription()
        const action = createAction()
        await action.perform()
    } catch (error) {
        const githubError = new GithubError(error)
        core.setFailed(githubError.toString())
    }
}

function createAction(): Action {
    const token = core.getInput("token")
    const context = github.context
    const git = github.getOctokit(token)
    const globber = new FileArtifactGlobber()

    const inputs = new CoreInputs(globber, context)
    const outputs = new CoreOutputs()
    const releases = new GithubReleases(inputs, git)
    const skipper = new ReleaseActionSkipper(inputs.skipIfReleaseExists, releases, inputs.tag)
    const uploader = new GithubArtifactUploader(releases, inputs.replacesArtifacts, inputs.artifactErrorsFailBuild)
    const artifactDestroyer = new GithubArtifactDestroyer(releases)

    return new Action(inputs, outputs, releases, uploader, artifactDestroyer, skipper)
}

run()
