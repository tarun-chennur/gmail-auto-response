// Generate credentials from the google cloud console and save as "credentials.js". Run using: node.
const fs = require('fs').promises;
const path = require('path');
const process = require('process');
const {authenticate} = require('@google-cloud/local-auth');
const {google} = require('googleapis');
const { Base64 } =require('js-base64');
const Mailparser = require('./node_modules/mailparser/lib/mail-parser.js');
const cheerio = require('cheerio');

// If modifying these scopes, delete token.json.
const SCOPES = ['https://www.googleapis.com/auth/gmail.readonly'];
// The file token.json stores the user's access and refresh tokens, and is
// created automatically when the authorization flow completes for the first
// time.
const TOKEN_PATH = path.join(process.cwd(), 'token.json');
const CREDENTIALS_PATH = path.join(process.cwd(), 'credentials.json');

/**
 * Reads previously authorized credentials from the save file.
 *
 * @return {Promise<OAuth2Client|null>}
 */
async function loadSavedCredentialsIfExist() {
  try {
    const content = await fs.readFile(TOKEN_PATH);
    const credentials = JSON.parse(content);
    return google.auth.fromJSON(credentials);
  } catch (err) {
    return null;
  }
}

/**
 * Serializes credentials to a file compatible with GoogleAUth.fromJSON.
 *
 * @param {OAuth2Client} client
 * @return {Promise<void>}
 */
async function saveCredentials(client) {
  const content = await fs.readFile(CREDENTIALS_PATH);
  const keys = JSON.parse(content);
  const key = keys.installed || keys.web;
  const payload = JSON.stringify({
    type: 'authorized_user',
    client_id: key.client_id,
    client_secret: key.client_secret,
    refresh_token: client.credentials.refresh_token,
  });
  await fs.writeFile(TOKEN_PATH, payload);
}

/**
 * Load or request or authorization to call APIs.
 *
 */
async function authorize() {
  let client = await loadSavedCredentialsIfExist();
  if (client) {
    return client;
  }
  client = await authenticate({
    scopes: SCOPES,
    keyfilePath: CREDENTIALS_PATH,
  });
  if (client.credentials) {
    await saveCredentials(client);
  }
  return client;
}




function getMail(msgId, auth){
    // console.log(msgId)
    const gmail = google.gmail({version: 'v1', auth});
    //This api call will fetch the mailbody.
    gmail.users.messages.get({
        userId:'me',
        id: msgId ,
    }, (err, res) => {
      console.log(res.data.labelIds.INBOX)
        if(!err){
          console.log("no error")
            var body = res.data.payload.parts[0].body.data;
  
            var htmlBody = Base64.decode(body.replace(/-/g, '+').replace(/_/g, '/'));
            console.log(htmlBody)
            
        }
    });
  }
  

async function listMessages(auth){
    var query = 'is:unread';
    return new Promise((resolve, reject) => {    
      const gmail = google.gmail({version: 'v1', auth});
      gmail.users.messages.list(      
        {        
          userId: 'me',  
          q:query,      
          maxResults:5     
        },            (err, res) => {        
          if (err) {                    reject(err);          
            return;        
          }        
          if (!res.data.messages) {                    resolve([]);          
            return;        
          }                resolve(res.data);  
                            console.log(res.data.messages)
  
                           getMail(res.data.messages[0].id, auth);
        }    
      );  
    })
  }
  
  var cronJob = require("cron").CronJob;

  // Run this cron job every Sunday (0) at 7:00:00 AM
  new cronJob("* * * * *", function() {
    authorize().then(listMessages).catch(console.error);
  }, null, true);



