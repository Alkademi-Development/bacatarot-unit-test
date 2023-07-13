import { describe, afterEach, before } from 'mocha';
import { Builder, By, Key, until, logging, Capabilities, Select } from 'selenium-webdriver';
import addContext from 'mochawesome/addContext.js';
import assert from 'assert';
import { expect } from "chai";
import yargs from 'yargs';
import fs from 'fs';
import path from 'path';
import { faker } from '@faker-js/faker';
import { BROWSERS } from '#root/commons/constants/browser';
import { loginToApp } from '#root/commons/utils/appUtils';
import { getUserAccount } from '#root/commons/utils/userUtils';
import { thrownAnError } from '#root/commons/utils/generalUtils';
import { takeScreenshot } from '#root/commons/utils/fileUtils';
import { goToApp } from '#root/commons/utils/appUtils';
import { appHost } from '#root/api/app-token';
import { fileURLToPath } from 'url';
import moment from 'moment-timezone';

/**
 * Get the user data for authentication
 */

const users = getUserAccount(yargs(process.argv.slice(2)).parse());

let driver;
let errorMessages;
let screenshootFilePath = fileURLToPath(import.meta.url);
if (process.platform === 'win32') {
    screenshootFilePath = path.resolve(`./testResults/screenshoots/${screenshootFilePath.replaceAll("\\", "\\").split("\\test\\")[1].replaceAll(".js", "")}/`);
} else {
    screenshootFilePath = path.resolve(`./testResults/screenshoots/${screenshootFilePath.split("/test/")[1].replaceAll(".js", "")}/`);
}

describe("Withdrawal", () => {
    let customMessages = [];

    after(async function () {
        console.log(`${' '.repeat(4)}Screenshoots test berhasil di buat, berada di folder: ${screenshootFilePath} `);
    });

    afterEach(async function () {
        fs.mkdir(screenshootFilePath, { recursive: true }, (error) => {
            if (error) {
                console.error(`Terjadi kesalahan dalam membuat folder screenshoot:`, error);
            }
        });
        let fileNamePath = path.resolve(`${screenshootFilePath}/${this.currentTest?.state != 'failed' ? (this.test?.parent.tests.findIndex(test => test.title === this.currentTest.title)) + 1 + '-[passed]' : (this.test?.parent.tests.findIndex(test => test.title === this.currentTest.title)) + 1 + '-[failed]' }.png`);
        await takeScreenshot(driver, fileNamePath);
        if(this.currentTest.isPassed) {
            addContext(this, {
                title: 'Expected Results',
                value: customMessages?.length > 0 ? "- " + customMessages.map(msg => msg.trim()).join("\n- ") : 'No Results'
            })
        } 

        // Performances Information
        const performanceTiming = await driver.executeScript('return window.performance.timing');
        const navigationStart = performanceTiming.navigationStart;
        addContext(this, {
            title: 'Performance Results',
            value: `${moment().tz('Asia/Jakarta').format('dddd, MMMM D, YYYY h:mm:ss A')}
(Durasi waktu navigasi: ${navigationStart % 60} seconds)   
=====================================================================
Waktu Permintaan Pertama (fetchStart): (${performanceTiming.fetchStart - navigationStart}) milliseconds ( ${(performanceTiming.fetchStart - navigationStart) / 1000} seconds )
Waktu Pencarian Nama Domain Dimulai (domainLookupStart): (${performanceTiming.domainLookupStart - navigationStart}) milliseconds ( ${((performanceTiming.domainLookupStart - navigationStart) / 1000)} seconds )
Waktu Pencarian Nama Domain Selesai (domainLookupEnd): (${performanceTiming.domainLookupEnd - navigationStart}) milliseconds ( ${((performanceTiming.domainLookupEnd - navigationStart) / 1000)} seconds )
Waktu Permintaan Dimulai (requestStart): (${performanceTiming.requestStart - navigationStart}) milliseconds ( ${((performanceTiming.requestStart - navigationStart) / 1000)} seconds )
=====================================================================
Waktu Respons Dimulai (responseStart): (${performanceTiming.responseStart - navigationStart}) milliseconds ( ${((performanceTiming.responseStart - navigationStart) / 1000)} seconds )
Waktu Respons Selesai (responseEnd): (${performanceTiming.responseEnd - navigationStart}) milliseconds ( ${((performanceTiming.responseEnd - navigationStart) / 1000)} seconds )
Waktu Memuat Dokumen (domLoading): (${performanceTiming.domLoading - navigationStart}) milliseconds ( ${((performanceTiming.domLoading - navigationStart) / 1000)} seconds )
=====================================================================
Waktu Event Unload Dimulai (unloadEventStart): (${performanceTiming.unloadEventStart - navigationStart}) milliseconds ( ${((performanceTiming.unloadEventStart - navigationStart) / 1000)} seconds )
Waktu Event Unload Selesai (unloadEventEnd): (${performanceTiming.unloadEventEnd - navigationStart}) milliseconds ( ${((performanceTiming.unloadEventEnd - navigationStart) / 1000)} seconds )
=====================================================================
Waktu Interaktif DOM (domInteractive): (${performanceTiming.domInteractive - navigationStart}) milliseconds ( ${((performanceTiming.domInteractive - navigationStart) / 1000)} seconds )
Waktu Event DOMContentLoaded Dimulai (domContentLoadedEventStart): (${performanceTiming.domContentLoadedEventStart - navigationStart}) milliseconds ( ${((performanceTiming.domContentLoadedEventStart - navigationStart) / 1000)} seconds )
Waktu Event DOMContentLoaded Selesai (domContentLoadedEventEnd): (${performanceTiming.domContentLoadedEventEnd - navigationStart}) milliseconds ( ${((performanceTiming.domContentLoadedEventEnd - navigationStart) / 1000)} seconds )
=====================================================================
Waktu Dokumen Selesai Dimuat (domComplete): (${performanceTiming.domComplete - navigationStart}) milliseconds ( ${((performanceTiming.domComplete - navigationStart) / 1000)} seconds )
Waktu Event Load Dimulai (loadEventStart): (${performanceTiming.loadEventStart - navigationStart}) milliseconds ( ${((performanceTiming.loadEventStart - navigationStart) / 1000)} seconds )
=====================================================================
(timestamp loadEventEnd: ${performanceTiming.loadEventEnd})
Waktu Event Load Selesai (loadEventEnd): (${performanceTiming.loadEventEnd - navigationStart}) milliseconds ( ${((performanceTiming.loadEventEnd - navigationStart) / 1000)} seconds )
            `
        });
        
        addContext(this, {
            title: 'Screenshoot-Test-Results',
            value: path.relative(fileURLToPath(import.meta.url), fileNamePath)
        });
        await driver.sleep(3000);
        try {
            await driver.close();
            await driver.quit();
        } catch (error) {
            console.error('Error occurred while quitting the driver:', error);
        }
    })

    BROWSERS.forEach(browser => {

        users.forEach(userData => {

            const data = userData?.split('=');
            const userAccount = data[1].split(';');
            const email = userAccount[0];
            const password = userAccount[1];
            const kind = parseInt(userAccount[2]);

            let user = { email, password, kind };

            switch (user.kind) {
                case 1:
                    it(`User - Test from browser ${browser}`, async () => {

                        try {

                            // Aksi masuk ke dalam halaman browser
                            driver = await goToApp(browser, appHost);
                            await driver.manage().window().maximize();

                            // Aksi menunggu mengisi form login untuk melakukan authentication
                            await loginToApp(driver, user, browser, appHost);

                            // Aksi Sleep
                            await driver.sleep(3000);

                        } catch (error) {
                            expect.fail(error);
                        }


                    });

                    break;

                case 2:
                    it(`Reader - Withdrawal using bank transaction from browser ${browser}`, async () => {

                        try {

                            // Aksi masuk ke dalam halaman browser
                            driver = await goToApp(browser, appHost);
                            await driver.manage().window().maximize();

                            // Aksi menunggu mengisi form login untuk melakukan authentication
                            await loginToApp(driver, user, browser, appHost);

                            // Aksi Sleep
                            await driver.sleep(3000);

                            // Aksi klik menu tab consultation
                            await driver.executeScript(`return document.querySelectorAll('ul.navbar-nav li.nav-item a a')[document.querySelectorAll('ul.navbar-nav li.nav-item a a').length - 1].click();`);

                            // Aksi Sleep
                            await driver.sleep(3000);

                            // Aksi mengecek coin yang ada pada reader
                            let readerName = await driver.executeScript(`return document.querySelector('.info-container h3.name').innerText;`);
                            let coinReader = await driver.executeScript(`return parseFloat(document.querySelector(".info-container p.balance").innerText.replace("Rp", "").replaceAll(".", ""))`);
                            await thrownAnError("Sorry unable to make a withdrawal because the coin is zero", await coinReader == 0);
                            
                            // Aksi Sleep
                            await driver.sleep(3000);

                            // Aksi klik button Tarik Tunai
                            await driver.executeScript(`return document.querySelectorAll('img.icon-sm')[document.querySelectorAll('img.icon-sm').length - 2].click();`);
                            
                            // Aksi Sleep
                            await driver.sleep(3000);

                            // Aksi klik button Buat Penarikan
                            await driver.executeScript(`return document.querySelector("#create-withdraw-button button").click()`);
                            
                            // Aksi Sleep
                            await driver.sleep(3000);

                            // Aksi memasukkan nominal penarikan uang (harus kelipatan 50 atau 100)
                            let amountInput = await driver.findElement(By.css('#withdraw-form #amount-container input'));
                            let randomAmount = faker.helpers.arrayElement([50000, 100000]);
                            await driver.sleep(1000);
                            await amountInput.sendKeys(randomAmount);
                            await driver.sleep(2000);
                            const isAllFilled = await Promise.all([
                                await driver.findElement(By.css("#withdraw-form #amount-container input")).getAttribute('value'),
                            ]).then(results => results.every(value => value != ''));
                            if(isAllFilled) await driver.executeScript(`return document.querySelector("#withdraw-form .button-container #orange-button button").click()`);
                            else await thrownAnError('Input field amount is still empty', !isAllFilled);

                            // Aksi Sleep
                            await driver.sleep(3000);

                            // Aksi klik button Lanjut
                            await driver.executeScript(`return document.querySelector("#withdraw-form .button-container #orange-button button").click()`);
                            
                            // Aksi Sleep
                            await driver.sleep(5000);
                            await driver.wait(until.elementLocated(By.css(".v-select")))

                            // Select withdraw by using bank transfer method
                            let inputSearch = await driver.findElement(By.css(".vs__selected-options input[type=search]"));
                            let action = await driver.actions({async: true});
                            await action.move({origin: await inputSearch}).press().perform();
                            await driver.sleep(2000);
                            // Aksi mengecek pilihan metode penarikan
                            let methodsWithdraw = await driver.executeScript(`
                                return Array.from(document.querySelectorAll('.v-select ul li')).filter(value => {
                                    return value.innerText.includes("Bank")
                                });
                            `)
                            let randomIndexBank = faker.number.int({ min: 0, max: await methodsWithdraw.length - 1 });
                            await driver.sleep(1000);
                            await driver.executeScript('arguments[0].scrollIntoView()', await methodsWithdraw[randomIndexBank]);
                            await driver.sleep(2000);
                            const actions = driver.actions({async: true});
                            await actions.doubleClick(await methodsWithdraw[randomIndexBank]).perform();
                            await driver.sleep(3000);
                            // Aksi klik button Lanjut
                            await driver.executeScript(`return document.querySelector("#withdraw-form .button-container #orange-button button").click()`);
                            
                            // Aksi Sleep
                            await driver.sleep(3000);

                            // Aksi mengisi form no.rek bank dan name
                            await driver.findElement(By.css('#account-info #accountNumber')).sendKeys(faker.finance.accountNumber(16))
                            await driver.findElement(By.css('#account-info #accountName')).sendKeys(await readerName);
                            await driver.sleep(1000);
                            // Aksi klik button Lanjut
                            await driver.executeScript(`return document.querySelector("#withdraw-form .button-container #orange-button button").click()`);
                            
                            // Aksi Sleep
                            await driver.sleep(3000);

                            // Aksi mengkonfirmasi penarikan / withdrawal
                            await driver.executeScript('window.scrollTo(0, document.body.scrollHeight)');
                            await driver.sleep(1000);
                            await driver.executeScript(`return document.querySelector('#agreement-container label').click();`);
                            await driver.sleep(2000);
                            await driver.executeScript(`return document.querySelector("#withdraw-form .button-container #orange-button button").click()`);
                            
                            // Aksi Sleep
                            await driver.sleep(5000);
                            await driver.wait(until.elementLocated(By.css('#withdraw-summary #amount-title')))
                            
                            // Expect results and add custom message for addtional description
                            let summaryWithdrawal = await driver.findElement(By.id('withdraw-summary'));
                            customMessages = [
                                await summaryWithdrawal.isDisplayed() ? 'Successfully make a withdrawal by using bank transfer method ✅' : 'Failed to make a withdrawal ❌'
                            ]
                            expect(await summaryWithdrawal.isDisplayed()).to.equal(true);
                            
                        } catch (error) {
                            expect.fail(error);
                        }

                    });

                    it(`Reader - Withdrawal using digital wallet from browser ${browser}`, async () => {

                        try {

                            // Aksi masuk ke dalam halaman browser
                            driver = await goToApp(browser, appHost);
                            await driver.manage().window().maximize();

                            // Aksi menunggu mengisi form login untuk melakukan authentication
                            await loginToApp(driver, user, browser, appHost);

                            // Aksi Sleep
                            await driver.sleep(3000);

                            // Aksi klik menu tab consultation
                            await driver.executeScript(`return document.querySelectorAll('ul.navbar-nav li.nav-item a a')[document.querySelectorAll('ul.navbar-nav li.nav-item a a').length - 1].click();`);

                            // Aksi Sleep
                            await driver.sleep(3000);

                            // Aksi mengecek coin yang ada pada reader
                            let readerName = await driver.executeScript(`return document.querySelector('.info-container h3.name').innerText;`);
                            let coinReader = await driver.executeScript(`return parseFloat(document.querySelector(".info-container p.balance").innerText.replace("Rp", "").replaceAll(".", ""))`);
                            await thrownAnError("Sorry unable to make a withdrawal because the coin is zero", await coinReader == 0);
                            
                            // Aksi Sleep
                            await driver.sleep(3000);

                            // Aksi klik button Tarik Tunai
                            await driver.executeScript(`return document.querySelectorAll('img.icon-sm')[document.querySelectorAll('img.icon-sm').length - 2].click();`);
                            
                            // Aksi Sleep
                            await driver.sleep(3000);

                            // Aksi klik button Buat Penarikan
                            await driver.executeScript(`return document.querySelector("#create-withdraw-button button").click()`);
                            
                            // Aksi Sleep
                            await driver.sleep(3000);

                            // Aksi memasukkan nominal penarikan uang (harus kelipatan 50 atau 100)
                            let amountInput = await driver.findElement(By.css('#withdraw-form #amount-container input'));
                            let randomAmount = faker.helpers.arrayElement([50000, 100000]);
                            await driver.sleep(1000);
                            await amountInput.sendKeys(randomAmount);
                            await driver.sleep(2000);
                            const isAllFilled = await Promise.all([
                                await driver.findElement(By.css("#withdraw-form #amount-container input")).getAttribute('value'),
                            ]).then(results => results.every(value => value != ''));
                            if(isAllFilled) await driver.executeScript(`return document.querySelector("#withdraw-form .button-container #orange-button button").click()`);
                            else await thrownAnError('Input field amount is still empty', !isAllFilled);

                            // Aksi Sleep
                            await driver.sleep(3000);

                            // Aksi klik button Lanjut
                            await driver.executeScript(`return document.querySelector("#withdraw-form .button-container #orange-button button").click()`);
                            
                            // Aksi Sleep
                            await driver.sleep(5000);
                            await driver.wait(until.elementLocated(By.css(".v-select")))

                            // Select withdraw by using bank transfer method
                            let inputSearch = await driver.findElement(By.css(".vs__selected-options input[type=search]"));
                            let action = await driver.actions({async: true});
                            await action.move({origin: await inputSearch}).press().perform();
                            await driver.sleep(2000);
                            // Aksi mengecek pilihan metode penarikan
                            let methodsDigitalWallet = await driver.executeScript(`
                                return Array.from(document.querySelectorAll('.v-select ul li')).filter(value => {
                                    return !value?.innerText.includes("Bank") && !value.innerText.includes("BPD") && !value.innerText.includes("BTPN") && !value.innerText.includes("Mandiri") && !value.innerText.includes("HSBC") && !value.innerText.includes("bank") && !value.innerText.includes("Eximbank") && !value.innerText.includes("Citibank")
                                });
                            `)
                            let randomIndexBank = faker.number.int({ min: 0, max: await methodsDigitalWallet.length - 1 });
                            await driver.sleep(1000);
                            await driver.executeScript('arguments[0].scrollIntoView()', await methodsDigitalWallet[randomIndexBank]);
                            await driver.sleep(2000);
                            const actions = driver.actions({async: true});
                            await actions.doubleClick(await methodsDigitalWallet[randomIndexBank]).perform();
                            await driver.sleep(3000);
                            // Aksi klik button Lanjut
                            await driver.executeScript(`return document.querySelector("#withdraw-form .button-container #orange-button button").click()`);
                            
                            // Aksi Sleep
                            await driver.sleep(3000);

                            // Aksi mengisi form no.rek bank dan name
                            await driver.findElement(By.css('#account-info #accountNumber')).sendKeys(faker.phone.number('08##########'))
                            await driver.findElement(By.css('#account-info #accountName')).sendKeys(await readerName);
                            await driver.sleep(1000);
                            // Aksi klik button Lanjut
                            await driver.executeScript(`return document.querySelector("#withdraw-form .button-container #orange-button button").click()`);
                            
                            // Aksi Sleep
                            await driver.sleep(3000);

                            // Aksi mengkonfirmasi penarikan / withdrawal
                            await driver.executeScript('window.scrollTo(0, document.body.scrollHeight)');
                            await driver.sleep(1000);
                            await driver.executeScript(`return document.querySelector('#agreement-container label').click();`);
                            await driver.sleep(2000);
                            await driver.executeScript(`return document.querySelector("#withdraw-form .button-container #orange-button button").click()`);
                            
                            // Aksi Sleep
                            await driver.sleep(5000);
                            await driver.wait(until.elementLocated(By.css('#withdraw-summary #amount-title')))
                            
                            // Expect results and add custom message for addtional description
                            let summaryWithdrawal = await driver.findElement(By.id('withdraw-summary'));
                            customMessages = [
                                await summaryWithdrawal.isDisplayed() ? 'Successfully make a withdrawal by using digital wallet method ✅' : 'Failed to make a withdrawal ❌'
                            ]
                            expect(await summaryWithdrawal.isDisplayed()).to.equal(true);
                            
                        } catch (error) {
                            expect.fail(error);
                        }

                    });
                    
                    it(`Reader - Details of withdrawal from browser ${browser}`, async () => {

                        try {

                            // Aksi masuk ke dalam halaman browser
                            driver = await goToApp(browser, appHost);
                            await driver.manage().window().maximize();

                            // Aksi menunggu mengisi form login untuk melakukan authentication
                            await loginToApp(driver, user, browser, appHost);

                            // Aksi Sleep
                            await driver.sleep(3000);

                            // Aksi klik menu tab consultation
                            await driver.executeScript(`return document.querySelectorAll('ul.navbar-nav li.nav-item a a')[document.querySelectorAll('ul.navbar-nav li.nav-item a a').length - 1].click();`);

                            // Aksi Sleep
                            await driver.sleep(3000);

                            // Aksi mengecek coin yang ada pada reader
                            let readerName = await driver.executeScript(`return document.querySelector('.info-container h3.name').innerText;`);
                            let coinReader = await driver.executeScript(`return parseFloat(document.querySelector(".info-container p.balance").innerText.replace("Rp", "").replaceAll(".", ""))`);
                            await thrownAnError("Sorry unable to make a withdrawal because the coin is zero", await coinReader == 0);
                            
                            // Aksi Sleep
                            await driver.sleep(3000);

                            // Aksi klik button Tarik Tunai
                            await driver.executeScript(`return document.querySelectorAll('img.icon-sm')[document.querySelectorAll('img.icon-sm').length - 2].click();`);
                            
                            // Aksi Sleep
                            await driver.sleep(3000);

                            // Aksi memilih dan klik salah satu withdraw card history
                            let withdrawCard = await driver.executeScript(`return document.querySelectorAll("#withdraw-history .withdraw-card h5.link")`);
                            await thrownAnError('Withdraw is empty', await withdrawCard.length == 0);
                            await driver.sleep(2000);
                            let randomIndexWithdraw = faker.number.int({ min: 0, max: withdrawCard.length - 1 });
                            await withdrawCard[randomIndexWithdraw].click();
                            
                            // Aksi Sleep
                            await driver.sleep(3000);
                            await driver.wait(until.elementLocated(By.id('withdraw-summary')))
                            
                            // Expect results and add custom message for addtional description
                            let summaryWithdrawal = await driver.findElement(By.id('withdraw-summary'));
                            customMessages = [
                                await summaryWithdrawal.isDisplayed() ? 'Successfully get a details information of withdrawal ✅' : 'Failed to get the details information of withdrawal ❌'
                            ]
                            expect(await summaryWithdrawal.isDisplayed()).to.equal(true);
                            
                        } catch (error) {
                            expect.fail(error);
                        }

                    });
                    
                    it(`Reader - Button CTA customer service from browser ${browser}`, async () => {

                        try {

                            // Aksi masuk ke dalam halaman browser
                            driver = await goToApp(browser, appHost);
                            await driver.manage().window().maximize();

                            // Aksi menunggu mengisi form login untuk melakukan authentication
                            await loginToApp(driver, user, browser, appHost);

                            // Aksi Sleep
                            await driver.sleep(3000);

                            // Aksi klik menu tab consultation
                            await driver.executeScript(`return document.querySelectorAll('ul.navbar-nav li.nav-item a a')[document.querySelectorAll('ul.navbar-nav li.nav-item a a').length - 1].click();`);

                            // Aksi Sleep
                            await driver.sleep(3000);

                            // Aksi mengecek coin yang ada pada reader
                            let readerName = await driver.executeScript(`return document.querySelector('.info-container h3.name').innerText;`);
                            let coinReader = await driver.executeScript(`return parseFloat(document.querySelector(".info-container p.balance").innerText.replace("Rp", "").replaceAll(".", ""))`);
                            await thrownAnError("Sorry unable to make a withdrawal because the coin is zero", await coinReader == 0);
                            
                            // Aksi Sleep
                            await driver.sleep(3000);

                            // Aksi klik button Tarik Tunai
                            await driver.executeScript(`return document.querySelectorAll('img.icon-sm')[document.querySelectorAll('img.icon-sm').length - 2].click();`);
                            
                            // Aksi Sleep
                            await driver.sleep(3000);

                            // Aksi memilih dan klik salah satu withdraw card history
                            let withdrawCard = await driver.executeScript(`return document.querySelectorAll("#withdraw-history .withdraw-card h5.link")`);
                            await thrownAnError('Withdraw is empty', await withdrawCard.length == 0);
                            await driver.sleep(2000);
                            let randomIndexWithdraw = faker.number.int({ min: 0, max: withdrawCard.length - 1 });
                            await withdrawCard[randomIndexWithdraw].click();
                            
                            // Aksi Sleep
                            await driver.sleep(3000);
                            await driver.wait(until.elementLocated(By.id('withdraw-summary')))

                            // Aksi scroll body
                            await driver.executeScript('window.scrollTo(0, document.body.scrollHeight)');

                            // Aksi Sleep
                            await driver.sleep(3000);

                            // Aksi klik button CTA customer service
                            await driver.executeScript(`return document.querySelectorAll(".button-container #orange-button button")[0].click()`);
                            
                            // Aksi Sleep
                            await driver.sleep(10000);
                            
                            // Expect results and add custom message for addtional description
                            const originalWindow = await driver.getWindowHandle();
                            const windows = await driver.getAllWindowHandles();
                            windows.forEach(async handle => {
                                if (handle !== originalWindow) {
                                    await driver.switchTo().window(handle);
                                }
                            });
                            await driver.wait(
                                async () => (await driver.getAllWindowHandles()).length === 2,
                                10000
                            );
                            
                            const currentUrl = await driver.getCurrentUrl();
                            const queries = new URLSearchParams(new URL(currentUrl).search);
                            customMessages = [
                                currentUrl.includes('https://api.whatsapp.com/send/?phone') && queries.phone != '' ? 'Successfully directed to the whatsapp contact of customer service ✅' : 'Failed to connect to whatsapp contact of customer service ❌'
                            ]
                            expect(currentUrl).to.contain('https://api.whatsapp.com/send/?phone')
                            expect(queries.phone).to.not.equal('')
                            
                        } catch (error) {
                            expect.fail(error);
                        }

                    });

                    break;

                default:
                    it(`Test Other - from browser ${browser}`, async () => {

                        try {

                        } catch (error) {
                            expect.fail(error);
                        }


                    });

                    break;
            }
        });

    })



});