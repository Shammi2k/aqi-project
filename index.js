import express from "express";
import {Octokit} from "octokit";
import fs from "fs";

const app = express();
const port = 3000;
var userData;
var PAT;

const getToken = () => {
    if (!PAT)
    {
        const data = fs.readFileSync("secrets.json");
        const dataJSON = JSON.parse(data);
        PAT = dataJSON.token;
        console.log("PAT loaded on server");
    }
    return PAT;
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

const octokit = new Octokit({ 
    auth: getToken(),
  });

// Use the static middleware to access data in the public folder
app.use(express.static("public"));

app.get("/", async (req, res) => {
    const userInfo = (await getUsersJSON()).data;
    const response = {};
    response.user = {};
    response.user.name = userInfo.name;
    response.user.link = userInfo.html_url;

    const organizations = (await getOrganizationsJSON()).data;
    response.organizations = organizations;
    res.render("index.ejs", response);
});

app.get("/orgs/*/repositories", async (req, res) => {
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
    console.log("Page : " + page);
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
});

app.get("/orgs/*", async (req, res) => {
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
});

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});