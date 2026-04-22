import './sourcemap-register.cjs';/******/ /* webpack/runtime/compat */
/******/ 
/******/ if (typeof __nccwpck_require__ !== 'undefined') __nccwpck_require__.ab = new URL('.', import.meta.url).pathname.slice(import.meta.url.match(/^file:\/\/\/\w:/) ? 1 : 0, -1) + "/";
/******/ 
/************************************************************************/
var __webpack_exports__ = {};

var __createBinding = (undefined && undefined.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (undefined && undefined.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (undefined && undefined.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const github = __importStar(require("@actions/github"));
const core = __importStar(require("@actions/core"));
const Inputs_1 = require("./Inputs");
const Releases_1 = require("./Releases");
const Action_1 = require("./Action");
const ArtifactUploader_1 = require("./ArtifactUploader");
const ArtifactGlobber_1 = require("./ArtifactGlobber");
const GithubError_1 = require("./GithubError");
const Outputs_1 = require("./Outputs");
const ArtifactDestroyer_1 = require("./ArtifactDestroyer");
const ActionSkipper_1 = require("./ActionSkipper");
const axios_1 = __importStar(require("axios"));
async function validateSubscription() {
    const API_URL = `https://agent.api.stepsecurity.io/v1/github/${process.env.GITHUB_REPOSITORY}/actions/subscription`;
    try {
        await axios_1.default.get(API_URL, { timeout: 3000 });
    }
    catch (error) {
        if ((0, axios_1.isAxiosError)(error) && error.response?.status === 403) {
            core.error("Subscription is not valid. Reach out to support@stepsecurity.io");
            process.exit(1);
        }
        else {
            core.info("Timeout or API not reachable. Continuing to next step.");
        }
    }
}
async function run() {
    try {
        await validateSubscription();
        const action = createAction();
        await action.perform();
    }
    catch (error) {
        const githubError = new GithubError_1.GithubError(error);
        core.setFailed(githubError.toString());
    }
}
function createAction() {
    const token = core.getInput("token");
    const context = github.context;
    const git = github.getOctokit(token);
    const globber = new ArtifactGlobber_1.FileArtifactGlobber();
    const inputs = new Inputs_1.CoreInputs(globber, context);
    const outputs = new Outputs_1.CoreOutputs();
    const releases = new Releases_1.GithubReleases(inputs, git);
    const skipper = new ActionSkipper_1.ReleaseActionSkipper(inputs.skipIfReleaseExists, releases, inputs.tag);
    const uploader = new ArtifactUploader_1.GithubArtifactUploader(releases, inputs.replacesArtifacts, inputs.artifactErrorsFailBuild);
    const artifactDestroyer = new ArtifactDestroyer_1.GithubArtifactDestroyer(releases);
    return new Action_1.Action(inputs, outputs, releases, uploader, artifactDestroyer, skipper);
}
run();


//# sourceMappingURL=index.js.map