const cds = require('@sap/cds');
const https = require('https');
const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');
const sharp = require('sharp');
const automationHelper = require('./automationHelper');
const Replay = require('@puppeteer/replay');
const { parse } = require('node-html-parser');
const { spawn } = require('child_process');
const { v4: uuidv4 } = require('uuid');

module.exports = cds.service.impl(async function() {
    const {document, entities, automations, reuse } = this.entities;

    this.before('CREATE', entities, async (req) => {
        const maxEntityId = await getMaxId("entityID", entities, req);
        req.data.entityID = `E${(maxEntityId + 1).toString().padStart(3, '0')}`;
    });

    this.before('UPDATE', document, async (req) => {
        const tx = cds.transaction(req);
        if(!req.data.source)
            return;

        // Clean text first
        req.data.source = clean_html(req.data.source);
        var root = parse(req.data.source);

        // Get Parameters
        //var entityID = req.data.entityID;
        var source = req.data.source;
        var documentID = req.data.documentID;

        // Delete all children first
        await DELETE.from(entities)
                .where({ document_documentID: documentID, hierarchyLevel: 0});

        // Add children according to html structure
        var maxEntityId = 0; //await getMaxId("entityID", entities, req);

        var appendix = "";
        var title = "[No Slide Title]";
        var order = 0;
        for(const child of root.childNodes) {
            if(child.nodeType === 1 && child.tagName === "H1")
            {
                const innerHTML = title;
                title = child.innerHTML;
                if(appendix !== "")
                {
                    const outterHTML = appendix;
                    appendix = "";
                    title = child.innerHTML;

                    maxEntityId++;
                    const childEntityID = `E${(maxEntityId).toString().padStart(3, '0')}`;

                    entityData = {
                        document_documentID: documentID,
                        entityID: uuidv4(),
                        title: innerHTML,
                        source: outterHTML,
                        parentNodeID: null,//entityID,
                        hierarchyLevel: 0,
                        drillState: "leaf",
                        order: order,
                    };
                    try {
                        order++;
                        await tx.run(INSERT.into(entities).entries(entityData));
                    }
                    catch (error) {
                        console.log(error.message)
                        await tx.rollback();
                        req.error(500, `Error creating related contents: ${error.message}`);
                    }
                }
            }
            else
            {
                appendix += child.outerHTML;
            }
        }

        if(appendix !== "")
        {
            const innerHTML = title;
            const outterHTML = appendix;
                    appendix = "";
                    title = "";

                    maxEntityId++;
                    const childEntityID = `E${(maxEntityId).toString().padStart(3, '0')}`;

                    entityData = {
                        document_documentID: documentID,
                        entityID: uuidv4(),
                        title: innerHTML,
                        source: outterHTML,
                        parentNodeID: null,//entityID,
                        hierarchyLevel: 0,
                        drillState: "leaf",
                        order: maxEntityId,
                    };
                    try {
                        await tx.run(INSERT.into(entities).entries(entityData));
                    }
                    catch (error) {
                        console.log(error.message)
                        await tx.rollback();
                        req.error(500, `Error creating related contents: ${error.message}`);
                    }
        }
    });

    async function resizeBase64ImageIfNeeded(base64Str, maxWidth, minWidth) {
        const buffer = Buffer.from(base64Str.split(',')[1], 'base64');
        const metadata = await sharp(buffer).metadata();
        console.log(metadata.width);
        if (metadata.width >= minWidth) {
          const resizedBuffer = await sharp(buffer)
            .resize({ width: maxWidth })
            .toBuffer();

            const resizedMetadata = await sharp(resizedBuffer).metadata();
            console.log(`Resized image size: ${resizedMetadata.width}x${resizedMetadata.height}`);
            console.log(`Resized buffer length: ${resizedBuffer.length} bytes`);

            return `data:image/jpeg;base64,${resizedBuffer.toString('base64')}`;
        }
        
        return null; // Return null if no resizing is done
      }

    this.on('createDocument', async (req) => {
        const { documentName } = req.data;

        const maxDocumentId = await getMaxId("documentID", document, req);
        const documentID = `P${(maxDocumentId + 1).toString().padStart(3, '0')}`;
        const maxEntityId = await getMaxId("entityID", entities, req);
        const entityID = `E${(maxEntityId + 1).toString().padStart(3, '0')}`;

        const documentData = {
            documentID: documentID,
            name: documentName,
            source: '<H1>Heading 1</H1><p>Each heading represents a slide. Change it to start.</p>'
        };

        try {
            await cds.run(INSERT.into(document).entries(documentData));
            return { success: true, message: "Document created successfully" };
        }
        catch (error) {
            return req.reject(500, `Failed to create document: ${error.message}`);
        }
    });

    this.on('createEntry', async (req) => {
        const tx = cds.transaction(req);

        // Entity Data
        const maxEntityId = await getMaxId("entityID", entities, req);
        const entityID = `E${(maxEntityId + 1).toString().padStart(3, '0')}`;
    
        const entityData = {
            document_documentID: req.data.documentID,
            entityID: entityID,
            content_contentID: req.data.contentID,
            parentNodeID: req.data.parentNodeID ? req.data.parentNodeID : null,
            hierarchyLevel: req.data.hierarchyLevel ? req.data.hierarchyLevel : 0,
            drillState: req.data.drillState ? req.data.drillState : "leaf",
            order: maxEntityId,
            source: req.data.source,
            title: req.data.title
        }

        try {
            await tx.run(INSERT.into(entities).entries(entityData));
            await tx.run(UPDATE(entities).set({source: req.data.source}).where({ entityID: entityID }));
            await tx.commit();
            console.log("Created entry successfully")
            return entityID;
        }
        catch (error) {
            console.log(error.message)
            await tx.rollback();
            req.error(500, `Error creating related contents: ${error.message}`);
        }   
    });

    this.on('syncAllAutomations', async (req) => {
        class Extension extends Replay.PuppeteerRunnerExtension {
            async beforeAllSteps(flow) {
              await super.beforeAllSteps(flow);
              console.log('starting');
            }
          
            async beforeEachStep(step, flow) {
              await super.beforeEachStep(step, flow);
              await wait(300)
              console.log('before', step);
            }
          
            async afterEachStep(step, flow) {
              await super.afterEachStep(step, flow);
              console.log('after', step);
            }
          
            async afterAllSteps(flow) {
              await super.afterAllSteps(flow);
              console.log('done');
            }
        }
        try {
            const tx = cds.transaction(req);
            const _automations = await tx.run(SELECT.from(automations).where({ document_documentID: req.data.documentID}));
            //const browser = await puppeteer.launch({ headless: false });
            const currentDate = new Date().toISOString();
            credentials = {}
            if(req.data.credentials) {
                credentials = JSON.parse(req.data.credentials);
            }
            console.log(credentials)
            var automationPromises = _automations.map(async (automation) => {
                console.log(automation)
                try {
                    var result = null;
                    if(!isValidJson(automation.selector)) {
                        console.log("Normal Sync")
                        result = await waitFunction(fetchAutomation, automation, credentials[automation.tag]);
                    }
                    else {
                        var browser, page;
                        try {         
                            browser, page = await waitFunction(automationHelper.prepareBrowser, automation.url);
                            console.log("page1", page)
                            page = await waitFunction(automationHelper.insertCredentials, page, credentials[automation.tag]);
                            console.log("page2", page)
                            const actions = JSON.parse(automation.selector);
                            const runner = await Replay.createRunner(actions, new Extension(browser, page, 20000));
                            try {
                                await runner.run();
                            } catch (error) {
                                console.error(error);
                            }
                            result = await waitFunction(automationHelper.captureResults, page);
                            console.log("page3", page)
                        }
                        catch(err) {console.error(err)}
                        finally {browser?.close}
                    }
                    
                    if(result)
                        await UPDATE(automations).set({ result: result, lastUpdate: currentDate}).where({ document_documentID: req.data.documentID, tag: automation.tag });
                    else
                        await UPDATE(automations).set({ result: "[Could not retrieve data...]"}).where({ document_documentID: req.data.documentID, tag: automation.tag });
                }
                catch(error) {
                    await UPDATE(automations).set({ result: "[Could not retrieve data...]",}).where({ document_documentID: req.data.documentID, tag: automation.tag });
                    return "Could not resolve " + automation.tag;
                }

            });

            await Promise.all(automationPromises)
            return req.reply({ status: 200, message: "Success" });
            
        }
        catch (error) {
            console.log(error);
            return req.error(500, "Internal Server Error");
        }
    });

    async function waitFunction(_function, ...args) {
        return new Promise((resolve, reject) => {
            try {
                resolve(_function(...args));
            } catch (error) {
                reject(error);
            }
        });
    }

    this.on('export', async (req) => {
        // Prepare the request data
        if(req.data.documentID)
        {
            // Replace all shared Reuses
            const sharedReuseElements = await SELECT.from(reuse);
            for (let i=0; i< sharedReuseElements.length; i++)
            {
                const searchString = sharedReuseElements[i].document_documentID + "-" + sharedReuseElements[i].tag
                if(req.data.html.includes(searchString))
                {
                    var regex = new RegExp(`<[^>]*>[^<]*${searchString}[^<]*<\\/[^>]+>`, 'gs');
                    if (!req.data.html.match(regex))
                        req.data.html = req.data.html.replaceAll(searchString, sharedReuseElements[i].source)
                    else
                        req.data.html = req.data.html.replace(regex, sharedReuseElements[i].source)
                }
                
            }

            // Replace all direct Reuses
            const reuseElements = await SELECT.from(reuse)
                .where({ document_documentID: req.data.documentID});
            for (let i=0; i< reuseElements.length; i++)
            {
                if(req.data.html.includes(reuseElements[i].tag))
                {
                    var regex = new RegExp(`<[^>]*>[^<]*${reuseElements[i].tag}[^<]*<\\/[^>]+>`, 'gs');
                    if (!req.data.html.match(regex))
                        req.data.html = req.data.html.replaceAll(reuseElements[i].tag, reuseElements[i].source)
                    else
                        req.data.html = req.data.html.replace(regex, reuseElements[i].source)
                }
                
            }

            // Replace all Automations
            const automationElements = await SELECT.from(automations)
                //.where({ document_documentID: req.data.documentID});
            for (let i=0; i< automationElements.length; i++)
            {
                if(req.data.html.includes(automationElements[i].tag))
                {
                    if (automationElements[i].result && automationElements[i].result !== "") {
                        var regex = new RegExp(`<[^>]*>[^<]*${automationElements[i].tag}[^<]*<\\/[^>]+>`, 'gs');
                        if (!req.data.html.match(regex))
                            req.data.html = req.data.html.replaceAll(automationElements[i].tag, automationElements[i].result)
                        else
                            req.data.html = req.data.html.replace(regex, automationElements[i].result)
                    }
                    else
                        req.data.html = req.data.html.replaceAll(automationElements[i].tag, "[Not synced yet, " + automationElements[i].tag + "]")
                }
                
            }
        }

        // Replace all images
        const root = parse(req.data.html);
        const tags = root.querySelectorAll('img');
        for (const element of tags) {
            const src = element.getAttribute('src');
            if (/^(https?:\/\/[^\s/$.?#].[^\s]*)$/i.test(src)) {
                const base64Image = await downloadImageAsBase64(src);
                element.setAttribute('src', base64Image);
            }
        }
        req.data.html = root.toString();
        req.data.html = clean_html(req.data.html);

        // Load template
        const filenameRegex = /^[\w,\s-]+\.[A-Za-z]{2,4}$/;
        if(req.data.template.match(filenameRegex))
        {
            const templatePath = path.join(__dirname, '..', "resources" , 'templates', req.data.template);
            const fileBuffer = fs.readFileSync(templatePath);
            req.data.template = fileBuffer.toString('base64');
        }

        // Call the Python script
        try {
            return call_python(req.data, path.join(__dirname, '..', 'scripts', 'export.py'));
        } 
        catch (error) {
            console.error('Error:', error);
            req.error({ code: '500', message: 'Internal Server Error' });
        }
    });

    function downloadImageAsBase64(url) {
        return new Promise((resolve, reject) => {
            https.get(url, (response) => {
                let data = [];
                response.on('data', (chunk) => {
                    data.push(chunk);
                });
                response.on('end', () => {
                    let buffer = Buffer.concat(data);
                    let base64 = buffer.toString('base64');
                    let mimeType = response.headers['content-type'];
                    if (mimeType === 'text/html') {
                        mimeType = 'image/png';
                        base64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/wcAAgAB/ebFfQAAAABJRU5ErkJggg=="
                    }
                    let base64Image = `data:${mimeType};base64,${base64}`;
                    resolve(base64Image);
                });
            }).on('error', (err) => {
                console.error('Error downloading the image:', err.message);
                reject(err);
            });
        });
    }

    function clean_html(html) 
    {
        //html = html.replace(/<\/p>\s*<p>\s*<\/p>\s*<p>\s*<strong>(.*?)<\/strong>\s*<\/p>\s*<p>\s*<\/p>/gi, ' $1 '); // Delete empty p tags around strong tags
        html = html.replace(/<p\b[^>]*>/g, "<p>")// Remove attributes out of p tag
        html = html.replace(/<\/?div[^>]*>/gi, ""); // Remove divs
        html = html.replace(/&nbsp;/g, "") // Remove nbsp
        html = html.replace(/\n/g, "") // Remove \n
        html = html.replace(/<h1[^>]*>\s*<\/h1>/g, '<p></p>'); // Replace empty h1 with p
        return html.replace(/<\/h1><h1/g, '</h1><p></p><h1'); // if two h1 tags directly follow each other, add a p tag in between
    }

    function call_python(data, scriptPath) {
        return new Promise((resolve, reject) => {
            const pythonExecPath = path.join(__dirname, '..', 'scripts', 'venv1', 'bin', 'python3');
            const pythonProcess = spawn(pythonExecPath, ['-u', scriptPath], { stdio: ['pipe', 'pipe', 'pipe'] });
            let dataString = '';
    
            pythonProcess.stdin.write(JSON.stringify(data));
            pythonProcess.stdin.end();
    
            pythonProcess.stdout.on('data', (data) => {
                console.log(`stdout: ${data}`);
                dataString += data.toString();
            });
    
            pythonProcess.stderr.on('data', (data) => {
                console.error(`stderr: ${data}`);
                reject(data.toString());
            });
    
            pythonProcess.on('close', (code) => {
                if (code === 0) {
                    try {
                        resolve(dataString);
                    } catch (error) {
                        reject(error);
                    }
                } else {
                    reject(`Process exited with code: ${code}`);
                }
            });
        });
    }
    

    async function wait(delay) {
        return new Promise(function (resolve, reject) {
            setTimeout(resolve, delay);
        });
    }

    async function fetchAutomation(automation, credentials = null) {
        let browser;
        try {
            browser = await puppeteer.launch({headless: true});
            const [page] = await browser.pages();
            const ua =
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/66.0.3359.181 Safari/537.36";
            await page.setUserAgent(ua);
            await page.goto(automation.url, { waitUntil: 'networkidle0'})//{ waitUntil: "networkidle0"});
            await page.setViewport({ width: 1920, height: 1080 });

            // Check Username & Password
            if(credentials && credentials.username && credentials.password) {
                const emailSelector = 'input[type="email"], input[name*="email"], input[id*="email"], input[placeholder*="Email"], input[placeholder*="email"], input[type="text"][name*="user"], input[type="text"][id*="user"], input[type="text"][placeholder*="user"]';
                const passwordSelector = 'input[type="password"], input[name*="password"], input[id*="password"], input[placeholder*="Password"], input[placeholder*="password"]';
                const continueSelector = 'button[type="submit"], button[class*="button"], button[id*="button"], button[name*="button"]';
                const submitSelector = 'form button[type="submit"], form input[type="submit"], button[type="submit"], button[class*="login"], button[id*="login"], button[name*="login"]';
                var emailInput = await page.$(emailSelector);
                var passwordInput = await page.$(passwordSelector);
                var loginButton = await page.$(submitSelector);

                if (emailInput) {
                    console.log('Logging in...');
                    await page.waitForSelector(emailSelector);
                    await page.type(emailSelector, credentials.username, { delay: 100 });
                    var needContinue = false;
                    if(passwordInput) {
                        const type = await passwordInput.evaluate(el => el.type);
                        if(type === "hidden") {
                            needContinue = true;
                        }
                    }
                    else {
                        needContinue = true;
                    }

                    if(needContinue) {
                        // Press continue
                        const continueButton = await page.$(continueSelector);
                        if (continueButton) {
                            await continueButton.click();
                        } else {
                            await page.keyboard.press('Enter');
                        }
                        page.waitForNavigation({ waitUntil: 'networkidle0' })
                    }

                    var _passwordInput = null;
                    try {
                        _passwordInput = await page.waitForSelector(passwordSelector, { timeout: 2000 });
                    } catch (error) {
                        page.waitForNavigation({ waitUntil: 'networkidle0' })
                    }
                    if(_passwordInput) {
                        await page.type(passwordSelector,  credentials.password, { delay: 100 });

                        // Press submit
                        const submitButton = await page.$(submitSelector);
                        if (submitButton) {
                            await submitButton.click();
                        } else {
                            await page.keyboard.press('Enter');
                        }
                        await wait(2000);
                    }
                }
            }

            // Accept cookies
            console.log('Accepting cookies');
            await new Promise(async (resolve, reject) => {            
                await page.evaluate(() => {
                    console.log('Evaluating cookies');
                    const expectedText = /^(Alle Akzeptieren|Akzeptieren|Accept|Accept all cookies|Accept all|Accept All|Allow|Allow all|Allow all cookies|Ok)$/gi;
                    
                    const clickAccept = (selector) => {
                        const elements = document.querySelectorAll(selector);
                        for (const element of elements) {
                            // Check the direct text content of the element
                            console.log("first content", element.textContent)
                            if (element.textContent.trim().match(expectedText)) {
                                console.log("first cookie", element.textContent)
                                element.click();
                                return true;
                            }
                            // Check text content within span or bdi elements inside the button
                            if (element.children && element.children.length > 0) {
                                const child = element.children[0];
                                console.log(child.textContent)
                                if (child && child.textContent.trim().match(expectedText)) {
                                    console.log('Clicking on cookie button with child element');
                                    element.click();
                                    return true;
                                }
                            }
                        }
                        return false;
                    }
                
                    if (clickAccept('a[id*=cookie i], a[class*=cookie i], button[id*=cookie i], button[class*=cookie i]')) {
                        return;
                    }
                
                    // Second try with broader selector
                    console.log('Second attempt');
                    clickAccept('a, button');
                });
                resolve();
            });

            await wait(2000);
            console.log('Cookies accepted');

            // Get content 
            if(automation.isScreenshot) {
                if(automation.selector === "html") {
                    const base64 = await page.screenshot({ encoding: 'base64', fullPage: true });
                    const html = `<img src="data:image/png;base64,${base64}" alt="Screenshot"/>`;
                    return html;
                }
                else {
                    const element = await page.$(automation.selector);
                    if (!element) {
                        return null;
                    }
                    const base64 = await element.screenshot({ encoding: 'base64' });
                    const html = `<img src="data:image/png;base64,${base64}" alt="Screenshot"/>`;
                    return html;
                }
            }
            else {
                const result = await page.evaluate((sel) => {
                    const element = document.querySelector(sel);
                    return element ? element.outerHTML : null;
                }, automation.selector);
                return result ? result : null;
            }
        }
        catch(err) {console.error(err)}
        finally {browser?.close}
    }

    this.on('getChildren', async (req) => {
        const children = await cds.tx(req).run(
            SELECT.from(entities)
                .where({ parentNodeID: req.data.entityID })
        );
        return children;
    });
    });

    async function getMaxId(entityKey, entities, req) {
        const tx = cds.transaction(req);
        const [lastEntity] = await tx.run(
            SELECT.from(entities).orderBy({ [entityKey]: 'desc' }).limit(1)
        );
        return lastEntity ? parseInt(lastEntity[entityKey].slice(1)) : 0;
    }

    function isValidJson(jsonString) {
        if (typeof jsonString !== 'string') {
            return false;
        }

        // Check if the string starts with '{' or '[' and ends with '}' or ']' to quickly filter out invalid JSON
        if (!jsonString.trim().startsWith('{') && !jsonString.trim().startsWith('[')) {
            return false;
        }
        if (!jsonString.trim().endsWith('}') && !jsonString.trim().endsWith(']')) {
            return false;
        }

        // Use JSON.parse() inside a function to avoid try-catch
        const validateJson = () => {
            JSON.parse(jsonString);
            return true;
        };

    return (validateJson() === true);
}