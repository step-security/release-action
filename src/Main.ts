import * as github from "@actions/github"
import * as core from "@actions/core"
import { CoreInputs } from "./Inputs.js"
import { GithubReleases } from "./Releases.js"
import { Action } from "./Action.js"
import { GithubArtifactUploader } from "./ArtifactUploader.js"
import { FileArtifactGlobber } from "./ArtifactGlobber.js"
import { GithubError } from "./GithubError.js"
import { CoreOutputs } from "./Outputs.js"
import { GithubArtifactDestroyer } from "./ArtifactDestroyer.js"
import { ActionSkipper, ReleaseActionSkipper } from "./ActionSkipper.js"
import axios, { isAxiosError } from "axios"

async function validateSubscription(): Promise<void> {
    const API_URL = `https://agent.api.stepsecurity.io/v1/github/${process.env.GITHUB_REPOSITORY}/actions/subscription`

    try {
        await axios.get(API_URL, { timeout: 3000 })
    } catch (error) {
        if (isAxiosError(error) && error.response?.status === 403) {
            core.error("Subscription is not valid. Reach out to support@stepsecurity.io")
            process.exit(1)
        } else {
            core.info("Timeout or API not reachable. Continuing to next step.")
        }
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
