const process = require('process')
const core = require('@actions/core')
const exec = require('@actions/exec')

async function run() {
    try {
        /*

    Required data:
    - GitHub username.
      - Required
    - GitHub token.
      - Required
    - Repository name.
      - Optional
      - Defaults to current repository owner/repo
    - Image name.
      - Optional
      - Defaults to current repository name
    - Image tag.
      - Optional
      - Defaults to current branch / tag

    Step 1. Log in to Docker.
    Step 2. Build the Docker image.
    Step 3. Push the Docker image.

    */

        // Set the workspace directory.
        const workspace =
            core.getInput('context') || process.env['GITHUB_WORKSPACE']

        // Log in to Docker.
        const username = core.getInput('username', { required: true })
        const password = core.getInput('personalAccessToken', {
            required: true
        })
        await exec.exec(`docker`, [
            'login',
            'docker.pkg.github.com',
            '--username',
            username,
            '--password',
            password
        ])

        // Process the repository name.
        let repository = core.getInput('repositoryName', { required: false })
        if (!repository) repository = process.env['GITHUB_REPOSITORY']

        // Process the image name.
        let imageName = core.getInput('imageName', { required: false })
        const repoArray = repository.split('/')
        if (!imageName) imageName = repoArray[repoArray.length - 1]

        const imageUrlBase = `docker.pkg.github.com/${repository}/${imageName}`
        const build = async (tag) => {
            await exec.exec(
                `docker`,
                ['build', '--tag', imageUrlBase + ':' + tag, workspace],
                { env: { DOCKER_BUILDKIT: '1' } }
            )
        }

        // Process the image tag.
        let imageTag = core.getInput('imageTag', { required: false })
        const ref = process.env['GITHUB_REF']
        const refArray = ref.split('/')
        if (!imageTag) imageTag = refArray[refArray.length - 1]

        // Build the Docker image.
        await build(imageTag)
        await build('latest')

        // Push the Docker image.
        await exec.exec(`docker`, ['push', imageUrlBase + ':latest'])
        // Push the Docker image.
        await exec.exec(`docker`, ['push', imageUrlBase + ':' + imageTag])

        // Output the image URL.
        const imageUrl = `docker.pkg.github.com/${repository}/${imageName}:latest`
        core.setOutput('imageURL', imageUrl)
        core.info(imageUrl)
    } catch (error) {
        core.setFailed(error.message)
    }
}

run()
