const puppeteer = require('puppeteer');
const { Replay } = require('@puppeteer/replay');

async function prepareBrowser(url) {
    let browser;
    try {
        browser = await puppeteer.launch({headless: false});
        const [page] = await browser.pages();
        const ua =
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/66.0.3359.181 Safari/537.36";
        await page.setUserAgent(ua);
        await page.goto(url, { waitUntil: 'networkidle0'})//{ waitUntil: "networkidle0"});
        await page.setViewport({ width: 773, height: 747 });  
        return browser, page;  
    }
    catch(err) {console.error(err)}
}

async function insertCredentials(page, credentials) {
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
    return page;
}

async function playAutomation(page, steps) {
    const stepsJson = JSON.parse(steps);
    for (const step of stepsJson.steps) {
        switch (step.type) {
            case 'setViewport':
                await page.setViewport({
                    width: step.width,
                    height: step.height,
                    deviceScaleFactor: step.deviceScaleFactor,
                    isMobile: step.isMobile,
                    hasTouch: step.hasTouch,
                    isLandscape: step.isLandscape
                });
                break;

            case 'navigate':
                await page.goto(step.url, { waitUntil: 'networkidle0' });
                break;

            case 'click':
            case 'waitForElement':
                const frame = step.frame ? (await page.frames())[step.frame[0]] : page;
                let element = null;
                for (const selectorGroup of step.selectors) {
                    try {
                        element = await frame.waitForSelector(selectorGroup, { timeout: 3000 });
                        if (element) break;
                    } catch (e) {
                        // Continue trying other selectors if current fails
                    }
                }
                if (element) {
                    if (step.type === 'click') {
                        const box = await element.boundingBox();
                        await page.mouse.click(box.x + step.offsetX, box.y + step.offsetY);
                    } else if (step.type === 'waitForElement') {
                        console.log(`Element found: ${step.selectors}`);
                    }
                } else {
                    console.error(`Element not found: ${step.selectors}`);
                }
                break;

            default:
                console.warn(`Step type not implemented: ${step.type}`);
        }
        await new Promise(resolve => setTimeout(resolve, 500));
    }
    return page;
}

async function captureResults(page) {
    const base64 = await page.screenshot({ encoding: 'base64', fullPage: true });
    const html = `<img src="data:image/png;base64,${base64}" alt="Screenshot"/>`;
    return html;
}

async function wait(delay) {
    return new Promise(function (resolve, reject) {
        setTimeout(resolve, delay);
    });
}

module.exports = {
    prepareBrowser,
    insertCredentials,
    playAutomation,
    captureResults
};

