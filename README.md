Hey fun people! This is the stuff you gotta do to run the app on your device:
1. Install Node.js - download it here: https://nodejs.org/ and the install it. You want Node.js v18 or later.
2. Open the repo on your chosen code editor (mine is VS Code). Then, on cmd, cd into the MakerspaceInventory directory.
3. Run Node app.js
4. **Optional** to make it so that you don't have to restart the app everytime you want to see the change you made reflected on the web page, run this: npm install -g nodemon. Then, instead of doing node app.js to run the app, do nodemon app.js. So, to see the changes, make sure you've saved the changes and then just refresh the page.
5. In a browser, go to http://localhost:3000
BTW I am on a PC. I'm not sure if this is different on a Mac

Optional:
6. Install MySQL Workbench to edit the db. I hosted it on AWS so that we are all working with the same db. The credentials are in the .env file.
