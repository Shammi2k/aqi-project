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
        const { data } = await octokit.request("/user");
        userData = data;
    }
    return userData;
}

const getOrganizationsJSON = async () => {
    const {data } = await octokit.request('GET /user/orgs')
    return data;
}

const octokit = new Octokit({ 
    auth: getToken(),
  });

// Use the static middleware to access data in the public folder
app.use(express.static("public"));

app.get("/", async (req, res) => {
    const userInfo = await getUsersJSON();
    const response = {};
    response.user = {};
    response.user.name = userInfo.name;
    response.user.link = userInfo.html_url;

    const organizations = await getOrganizationsJSON();
    response.organizations = organizations;
    res.render("index.ejs", response);
});

app.get("/orgs/*", async (req, res) => {
    const userInfo = await getUsersJSON();
    const response = {};
    response.user = {};
    response.user.name = userInfo.name;
    res.render("org.ejs", response);
});

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});