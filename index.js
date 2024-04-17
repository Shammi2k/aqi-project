import express from "express";
import {Octokit} from "octokit";
import fs from "fs";

const app = express();
const port = 3000;
var userData;

const getToken = () => {
    const data = fs.readFileSync("secrets.json");
    const dataJSON = JSON.parse(data);
    return dataJSON.token;
}

const getUsersJSON = async () => {
    if (!userData)
    {
        const response = await octokit.request("/user");
        userData = response;
    }
    return userData;
}

const getOrganizationsJSON = async () => {
    const response = await octokit.request('GET /user/orgs')
    return response;
}

const getRepositoriesJSON = async (orgName, page) => {
    const response = await octokit.request(`GET /orgs/${orgName}/repos?page=${page}`);
    return response;
}

const getPRsJSON = async (orgName, repoName) => {
    const response = await octokit.request('GET /repos/{org}/{repo}/pulls', {
        org: orgName,
        repo: repoName
    });
    return response;
}

const getReviewsJSON = async (orgName, repoName, pullNumber) => {
    const response = await octokit.request('GET /repos/{org}/{repo}/pulls/{pull_number}/reviews', {
        org: orgName,
        repo: repoName,
        pull_number: pullNumber
    });
    return response;
}

const octokit = new Octokit({ 
    auth: getToken(),
  });

// Use the static middleware to access data in the public folder
app.use(express.static("public"));

app.get("/", async (req, res) => {
    try {
        const userInfo = (await getUsersJSON()).data;
        const response = {};
        response.user = {};
        response.user.name = userInfo.name;
        response.user.link = userInfo.html_url;

        const organizations = (await getOrganizationsJSON()).data;
        response.organizations = organizations;
        res.render("index.ejs", response);
    } catch (error) {
        console.log(error.message);
        res.status(error.status).send(error.message);
    }
});

app.get("/orgs/*/repositories/*", async (req, res) => {
    try {
        const response = {};
        const userInfo = (await getUsersJSON()).data;
        response.user = {};
        response.user.name = userInfo.name;
        const orgName = req.url.split("/orgs/")[1].split("/repositories")[0];
        const repoName = req.url.split("repositories/")[1];
        response.repoName = repoName;
        const prsList = (await getPRsJSON(orgName, repoName)).data;
        for(const pr of prsList) {
            const reviewsJSON = (await getReviewsJSON(orgName, repoName, pr.number)).data;
            const reviewedUsers = {};
            reviewsJSON.forEach(review => {
                if (review.state == "APPROVED" || review.state == "CHANGES_REQUESTED")
                {
                    reviewedUsers[review.user.id] = review;
                }
            });
            
            pr.reviewedUsers = reviewedUsers;
        };
        response.prs = prsList;
        res.render("repo.ejs", response);
    } catch (error) {
        console.log(error.message);
        res.status(error.status).send(error.message);
    }
});

app.get("/orgs/*/repositories", async (req, res) => {
    try {
        const userInfo = (await getUsersJSON()).data;
        const response = {};
        response.pagination = true;
        response.user = {};
        response.user.name = userInfo.name;

        var orgName = req.url.split("/orgs/")[1].split("/repositories")[0];
        response.orgName = orgName;
        var page = 1;
        if (req.query.page)
        {
            page = parseInt(req.query.page);
        }
        response.page = page;
        const repos = await getRepositoriesJSON(orgName, page);
        const linkHeader = repos.headers.link;
        const hasNextPage = linkHeader && linkHeader.includes(`rel=\"next\"`);
        const hasPrevPage = linkHeader && linkHeader.includes(`rel=\"prev\"`);
        if (hasNextPage) {
        response.nextPage = linkHeader.split(">; rel=\"next\"")[0].split("?page=").pop();
        response.lastPage = linkHeader.split(">; rel=\"last\"")[0].split("?page=").pop();
        }
        if (hasPrevPage) {
            response.prevPage = linkHeader.split(">; rel=\"prev\"")[0].split("?page=").pop();
            response.firstPage = linkHeader.split(">; rel=\"first\"")[0].split("?page=").pop();
        }
        response.repos = repos.data;
        res.render("reposList.ejs", response);
    } catch (error) {
        console.log(error.message);
        res.status(error.status).send(error.message);
    }
});

app.get("/orgs/*", async (req, res) => {
    try {
        const userInfo = (await getUsersJSON()).data;
        const response = {};
        response.showAllRepos = true;
        response.user = {};
        response.user.name = userInfo.name;

        var orgName = req.url.split("/orgs/")[1];
        response.orgName = orgName;
        const repos = await getRepositoriesJSON(orgName, 1);
        response.repos = repos.data;
        res.render("org.ejs", response);
    } catch (error) {
        console.log(error.message);
        res.status(error.status).send(error.message);
    }
});

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});