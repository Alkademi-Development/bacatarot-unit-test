import { describe, afterEach } from 'mocha';
import { By, Key, until } from 'selenium-webdriver';
import addContext from 'mochawesome/addContext.js';
import { expect } from "chai";
import * as chai from "chai";
import yargs from 'yargs';
import fs from 'fs';
import path from 'path';
import { BROWSERS } from '#root/commons/constants/browser';
import { getUserAccount } from '#root/commons/utils/userUtils';
import { goToApp, loginToApp } from '#root/commons/utils/appUtils';
import { appHost } from '#root/api/app-token';
import { takeScreenshot } from '#root/commons/utils/fileUtils';
import { fileURLToPath } from 'url';
import { captureConsoleErrors } from '#root/commons/utils/generalUtils';
import { thrownAnError } from '#root/commons/utils/generalUtils';
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

describe("Authentication", () => {
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
        let fileNamePath = path.resolve(`${screenshootFilePath}/${this.currentTest?.state != 'failed' ? (this.test?.parent.tests.findIndex(test => test.title === this.currentTest.title)) + 1 + '-[passed]-' + moment().tz("Asia/Jakarta").format("YYYY-MM-DD_HH-mm-ss") : (this.test?.parent.tests.findIndex(test => test.title === this.currentTest.title)) + 1 + '-[failed]-' + moment().tz("Asia/Jakarta").format("YYYY-MM-DD_HH-mm-ss") }.png`);
        await takeScreenshot(driver, fileNamePath);
        if(this.currentTest.isPassed) {
            addContext(this, {
                title: 'Expected Results',
                value: customMessages?.length > 0 ? "- " + customMessages?.map(msg => msg.trim()).join("\n- ") : 'No Results'
            })
        } else if (this.currentTest.isFailed) {
            addContext(this, {
                title: 'Status Test',
                value: 'Failed ❌'
            })
        }

        // Performances Information
        const performanceTiming = await driver.executeScript('return window.performance.timing');
        const navigationStart = performanceTiming.navigationStart;
        addContext(this, {
            title: 'Performance Results',
            value: `${moment().tz('Asia/Jakarta').format('dddd, MMMM D, YYYY h:mm:ss A')}
(timestamp navigasi di mulai: ${navigationStart})   
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
        })

        addContext(this, {
            title: 'Screenshoot-Test-Results',
            value: "..\\" + path.relative(fileURLToPath(import.meta.url), fileNamePath)
        });
        await driver.sleep(3000);
        await driver.quit();
    })

    BROWSERS.forEach(async browser => {

        users.forEach(userData => {

            const data = userData?.split('=');
            const userAccount = data[1].split(';');
            const email = userAccount[0];
            const password = userAccount[1];
            const name = userAccount[2];
            const kind = parseInt(userAccount[3]);

            let user = { name, email, password, kind };

            switch (user.kind) {
                case 1:
                    it(`User - Login from browser ${browser}`, async () => {

                        try {
                            // Aksi masuk ke dalam halaman browser
                            driver = await goToApp(browser, appHost);
                            await driver.manage().window().maximize();

                            // Aksi menunggu mengisi form login untuk melakukan authentication
                            await loginToApp(driver, user, browser, appHost);
                            
                            // Aksi menunggu response halaman ter-load semua
                            await driver.wait(async function () {
                                const isNetworkIdle = await driver.executeScript(function () {
                                  const performanceEntries = window.performance.getEntriesByType('resource');
                                  return performanceEntries.every(function (entry) {
                                    return entry.responseEnd > 0;
                                  });
                                });
                              
                                return isNetworkIdle;
                            }, 10000); 

                            // Results
                            let userData = await driver.executeScript("return window.localStorage.getItem('user_data')");
                            userData = await JSON.parse(userData);
                            let currentUrl = await driver.getCurrentUrl();

                            // Expect results and add custom message for addtional description
                            customMessages = [
                                userData?.id > 0 ? "Successfully get the data user from local storage ✅" : "No data available from local storage ❌",
                                currentUrl === appHost + 'user' ? 'Successfully go into dashboard user page ✅' : 'Successfully go into dashboard user page ❌' 
                            ]
                            expect(parseInt(userData.id)).to.greaterThan(0);
                            expect(currentUrl).to.equal(appHost + 'user');

                        } catch (error) {
                            expect.fail(error);
                        }


                    });
                    
                    it(`User - Logout from browser ${browser}`, async () => {

                        try {
                            // Aksi masuk ke dalam halaman browser
                            driver = await goToApp(browser, appHost);
                            await driver.manage().window().maximize();

                            // Aksi menunggu mengisi form login untuk melakukan authentication
                            await loginToApp(driver, user, browser, appHost);

                            // Aksi sleep
                            await driver.sleep(5000);

                            // Aksi klik button profile
                            await driver.executeScript(`return document.querySelectorAll("ul.navbar-nav li.nav-item a a")[3].click()`);

                            // Aksi Sleep
                            await driver.sleep(3000);

                            // Aksi klik button logout
                            await driver.executeScript(`return document.querySelector('button.logout-btn').click()`);

                            // Aksi sleep
                            await driver.sleep(5000);

                            // Results
                            let userData = await driver.executeScript("return window.localStorage.getItem('user_data')");
                            userData = await JSON.parse(userData);

                            // Expect results and add custom message for addtional description
                            customMessages = [
                                userData === null || userData === undefined ? "Successfully remove the data of user from local storage ✅" : "Failed to remove data of user from local storage ❌",
                            ]
                            expect(userData).to.equal(null);

                        } catch (error) {
                            expect.fail(error);
                        }


                    });

                    break;
                
                case 2: 
                    it(`Reader - Login from browser ${browser}`, async function() {

                        try {
                            // Aksi masuk ke dalam halaman browser
                            driver = await goToApp(browser, appHost);
                            await driver.manage().window().maximize();

                            // Aksi menunggu mengisi form login untuk melakukan authentication
                            await loginToApp(driver, user, browser, appHost);

                            // Aksi menunggu response halaman ter-load semua
                            await driver.wait(async function () {
                                const isNetworkIdle = await driver.executeScript(function () {
                                  const performanceEntries = window.performance.getEntriesByType('resource');
                                  return performanceEntries.every(function (entry) {
                                    return entry.responseEnd > 0;
                                  });
                                });
                              
                                return isNetworkIdle;
                            }, 10000); 

                            // Results
                            let userData = await driver.executeScript("return window.localStorage.getItem('user_data')");
                            userData = await JSON.parse(userData);
                            let currentUrl = await driver.getCurrentUrl();

                            // Expect results and add custom message for addtional description
                            customMessages = [
                                userData?.id > 0 ? "Successfully get the data reader account from local storage ✅" : "No data available from local storage ❌",
                                currentUrl === appHost + 'reader' ? 'Successfully go into dashboard reader page ✅' : 'Successfully go into dashboard reader page ❌' 
                            ]
                            expect(parseInt(userData.id)).to.greaterThan(0);
                            expect(currentUrl).to.equal(appHost + 'reader');

                        } catch (error) {
                            expect.fail(error);
                        }


                    });
                    
                    it(`Reader - Logout from browser ${browser}`, async () => {

                        try {
                            // Aksi masuk ke dalam halaman browser
                            driver = await goToApp(browser, appHost);
                            await driver.manage().window().maximize();

                            // Aksi menunggu mengisi form login untuk melakukan authentication
                            await loginToApp(driver, user, browser, appHost);

                            // Aksi sleep
                            await driver.sleep(5000);

                            // Aksi klik button profile
                            await driver.executeScript(`return document.querySelectorAll("ul.navbar-nav li.nav-item a a")[3].click()`);

                            // Aksi Sleep
                            await driver.sleep(3000);

                            // Aksi klik button logout
                            await driver.executeScript(`return document.querySelectorAll('img.icon-sm')[document.querySelectorAll('img.icon-sm').length - 1].click();`);

                            // Aksi sleep
                            await driver.sleep(5000);

                            // Results
                            let userData = await driver.executeScript("return window.localStorage.getItem('user_data')");
                            userData = await JSON.parse(userData);

                            // Expect results and add custom message for addtional description
                            customMessages = [
                                userData === null || userData === undefined ? "Successfully remove the data of reader account from local storage ✅" : "Failed to remove data of reader account from local storage ❌",
                            ]
                            expect(userData).to.equal(null);

                        } catch (error) {
                            expect.fail(error);
                        }


                    });
                    
                    it(`Reader - Change a password from browser ${browser}`, async () => {

                        try {
                            // Aksi masuk ke dalam halaman browser
                            driver = await goToApp(browser, appHost);
                            await driver.manage().window().maximize();

                            // Aksi menunggu mengisi form login untuk melakukan authentication
                            await loginToApp(driver, user, browser, appHost);

                            // Aksi sleep
                            await driver.sleep(5000);

                            // Aksi klik button profile
                            await driver.executeScript(`return document.querySelectorAll("ul.navbar-nav li.nav-item a a")[3].click()`);

                            // Aksi Sleep
                            await driver.sleep(3000);

                            // Aksi klik button logout
                            await driver.executeScript(`return document.querySelectorAll('img.icon-sm')[1].click();`);

                            // Aksi sleep
                            await driver.sleep(3000);

                            // Aksi klik tab button Ganti Password
                            await driver.executeScript(`return document.querySelectorAll('.row .item-setting')[1].click()`);

                            // Aksi sleep
                            await driver.sleep(3000);

                            // Fill all input
                            let oldPassword = await user.password;
                            let newPassword = 'semuasama';
                            await driver.findElement(By.css('input#oldPassword')).sendKeys(oldPassword);
                            await driver.findElement(By.css('input#newPassword')).sendKeys(newPassword);
                            await driver.findElement(By.css('input#confirmPassword')).sendKeys(newPassword);
                            // Aksi sleep
                            await driver.sleep(3000);
                            // Aksi klik button simpan
                            await driver.executeScript(`return document.querySelector('button.btn-simpan').click()`);

                            // Aksi sleep
                            await driver.sleep(5000);

                            // Check if alert success is display
                            let alertWarning = await driver.executeScript(`return document.querySelector('toasted.bubble.warning')`);
                            await thrownAnError(await alertWarning?.getAttribute('innerText'), await alertWarning?.isDisplayed());

                            // Aksi sleep
                            await driver.sleep(3000);

                            // Try logout and login again with a new password
                            // Aksi klik button profile
                            await driver.executeScript(`return document.querySelectorAll("ul.navbar-nav li.nav-item a a")[3].click()`);

                            // Aksi Sleep
                            await driver.sleep(3000);

                            // Aksi klik button logout
                            await driver.executeScript(`return document.querySelectorAll('img.icon-sm')[document.querySelectorAll('img.icon-sm').length - 1].click();`);

                            // Aksi sleep
                            await driver.sleep(5000);

                            // Aksi Input Data Akun 
                            await driver.wait(until.elementLocated(By.css(`input#email`)));
                            await driver.findElement(By.css(`input#email`)).sendKeys(user.email, Key.RETURN);
                            await driver.findElement(By.css(`input#password`)).sendKeys(newPassword);
                            // Aksi sleep
                            await driver.sleep(1000);
                            let inputValuePassword = '';
                            inputValuePassword = await driver.findElement(By.css('input#password')).getAttribute('value');
                            await driver.executeScript(`return document.querySelector('button.login-btn').click()`);
                            // Aksi Sleep
                            await driver.sleep(3000);
                            // Aksi mengecek ada warning atau tidak pada saat submit login form
                            let errorElement = await driver.executeScript(`return document.querySelectorAll('p.error');`)
                            if (errorElement.length > 0) await thrownAnError(await driver.executeScript(`return document.querySelector('p.error').innerText;`), errorElement.length > 0);
                            
                            
                            // Aksi menunggu header active user
                            await driver.wait(until.elementLocated(By.css("div.active-user")));

                            // Results
                            let userData = await driver.executeScript("return window.localStorage.getItem('user_data')");
                            userData = await JSON.parse(userData);
                            let currentUrl = await driver.getCurrentUrl();

                            // Expect results and add custom message for addtional description
                            customMessages = [
                                newPassword === inputValuePassword ? "Successfully changed the user password ✅" : "Failed to change the user password ❌",
                                userData?.id > 0 ? "Successfully get the data reader account from local storage ✅" : "No data available from local storage ❌",
                                currentUrl === appHost + 'reader' ? 'Successfully go into dashboard reader page ✅' : 'Successfully go into dashboard reader page ❌' 
                            ]
                            expect(newPassword).to.eq(inputValuePassword);
                            expect(parseInt(userData.id)).to.greaterThan(0);
                            expect(currentUrl).to.equal(appHost + 'reader');

                        } catch (error) {
                            expect.fail(error);
                        }


                    });

                    break;
                
                default:
                    it(`Test Other - Login from browser ${browser}`, async function() {

                        try {
                            // Aksi masuk ke dalam halaman browser
                            driver = await goToApp(browser, appHost);
                            await driver.manage().window().maximize();

                            // Aksi menunggu mengisi form login untuk melakukan authentication
                            await loginToApp(driver, user, browser, appHost);

                            // Results
                            let userData = await driver.executeScript("return window.localStorage.getItem('user_data')");
                            userData = await JSON.parse(userData);

                            // Expect results and add custom message for addtional description
                            customMessages = [
                                userData?.id > 0 ? "Successfully get the data reader account from local storage ✅" : "No data available from local storage ❌",
                            ]
                            expect(parseInt(userData.id)).to.greaterThan(0);

                        } catch (error) {
                            expect.fail(error);
                        }


                    });

                    break;
            }
        });

    })



});