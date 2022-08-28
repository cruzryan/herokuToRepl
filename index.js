import fs from "fs";
import path from "path"
import Conf from 'conf';
import inquirer from "inquirer";
import ora from 'ora';

import {graphql} from './graphql.mjs';
import { CREATE_REPL } from './queries.mjs';
import { spawn }  from 'child_process';
import chalk from 'chalk';
import { Crosis } from "crosis4furrets";
const config = new Conf();

function readFilesSync(dir) {
    const files = [];
    fs.readdirSync(dir).forEach(filename => {
      const name = path.parse(filename).name;
      const filepath = path.resolve(dir, filename);
      const stat = fs.statSync(filepath);
      const isFile = stat.isFile();
  
      if (isFile){
          files.push({ filepath, name, }) 
      }else {
          let f2 = readFilesSync(filepath)
          f2.forEach(file => files.push(file))
      };
    });
  
    files.sort((a, b) => {
      return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
    });
  
    return files;
  }

function loginHeroku(){

    let hr = spawn("heroku login",{
        stdio: ['pipe', 'pipe', 'pipe'],
        shell: true,
      })
    
    hr.stdin.setEncoding('utf-8');
    hr.stdin.write("a")
    hr.stdin.end()

    console.log(chalk.yellow("A Heroku login window was just opened in your browser!,"), chalk.gray("if it didn't open, please install Heroku CLI at:" + chalk.underline(" https://devcenter.heroku.com/articles/heroku-cli#install-the-heroku-cli ")))
}

async function createRepl(name, lang){
    console.log("Creating repl!")

    const newRepl = await graphql(
        CREATE_REPL,
        { input: { title:name, language:lang } },
    );

    if(!newRepl.data.createRepl.id) {
        logger.error(
            `could not create a new repl ${
                newRepl.data
                    ? `because ${newRepl.data?.createRepl?.message.toLowerCase()}`
                    : `, ${newRepl.errors}`
            }`);
        process.exit(0);
    };

    const { data: { createRepl: { id: newReplId, url } } } = newRepl;

    const newReplClient = new Crosis({token: config.get("login").trim(), replId: newRepl.data.createRepl.id});

    const spinnerConnections = ora({
        text: 'Connecting to repl...',
        spinner: 'point',
    }).start();

    await newReplClient.connect();
    await newReplClient.persist();
    spinnerConnections.succeed('Connected to remote repl.');
    await newReplClient.removeAll();

    await transferFiles(newReplClient, name);

    const spinnerSave = ora({
        text: 'Saving your new repl...',
        spinner: 'point',
    }).start();
    await newReplClient.snapshot();
    await newReplClient.close();
    spinnerSave.succeed(chalk.bold('Your new repl is ready, view it at: https://replit.com' + url));
}

async function transferFiles(newRepl, name) {

    const readingSpinner = ora({
		text: 'Indexing files to transfer...',
		spinner: 'point',
	}).start();
    const files = readFilesSync(`./${name}/`);
    readingSpinner.succeed("Files indexed.")


	const spinnerTransfer = ora({
		text: 'Starting transfer...',
		spinner: 'point',
	}).start();

    files.forEach(file => {
        let dat = fs.readFileSync(file.filepath)
        let relpath = file.filepath.split(name)[1]
        let truepath = "./" + name + "/" + relpath
        async function t(){
            await newRepl.write(truepath, dat).catch((err) => {
                console.log("could not transfer: ", truepath)
                console.error(err)
            });
        }

        t()
    })

	spinnerTransfer.succeed('Transferred files to new repl.');
};

function askReplitID(){

    console.log(chalk.red("Reminder: do not share your Replit Session ID with anyone."), chalk.gray("To get yours follow this tutorial: https://replit.com/talk/learn/How-to-Get-Your-SID-Cookie/145979"))
    inquirer.prompt({
	    type: 'input',
	    name: 'token',
	    message: "Your Replit Session ID (connect.sid):",
			default: process.env.HEROKU_PROJECT,
	  }).then(async (tokenID) => {
        config.set("login", tokenID.token)
        askForProjectInfo()
      })
}

function cloneProject(name, lang){
    console.log(chalk.yellow("Cloning " + name + "..."))
    let hr = spawn(`heroku git:clone -a ${name}`,{
        stdio: "inherit",
        shell: true,
    })

    hr.on("exit", () => {
        hr = null;
        createRepl(name, lang)
    })
}

function askForProjectInfo(){
    inquirer.prompt({
	    type: 'input',
	    name: 'projname',
	    message: "Name of your project (case sensitive):",
			default: process.env.HEROKU_PROJECT,
	  }).then(async (heroku_project) => {
        inquirer.prompt({
            type: 'input',
            name: 'lang',
            message: "New repl language:",
                default: process.env.PROJ_LANG,
          }).then(async (langdata) => {
                cloneProject(heroku_project.projname, langdata.lang)
          })

      })
}

export function main(){
    console.log(chalk.green("Heroku to Repl! #teamReplit"))
    loginHeroku()
    askReplitID()

}
