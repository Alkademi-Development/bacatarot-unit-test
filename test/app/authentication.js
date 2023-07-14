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
import { faker } from '@faker-js/faker';

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
        let fileNamePath = path.resolve(`${screenshootFilePath}/${this.currentTest?.state != 'failed' ? (this.test?.parent.tests.findIndex(test => test.title === this.currentTest.title)) + 1 + '-[passed]' : (this.test?.parent.tests.findIndex(test => test.title === this.currentTest.title)) + 1 + '-[failed]' }.png`);
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
        })

        addContext(this, {
            title: 'Screenshoot-Test-Results',
            value: "..\\" + path.relative(fileURLToPath(import.meta.url), fileNamePath)
        });
        await driver.sleep(3000);
        try {
            await driver.close();
            await driver.quit();
        } catch (error) {
            console.error('Error occurred while quitting the driver:', error);
        }
    })

    BROWSERS.forEach(async browser => {

        users.forEach(userData => {

            const data = userData?.split('=');
            const userAccount = data[1].split(';');
            const email = userAccount[0];
            const password = userAccount[1];
            const kind = parseInt(userAccount[2]);

            let user = { email, password, kind };

            switch (user.kind) {
                case 1:
                    it.skip(`User - Login from browser ${browser}`, async () => {

                        try {
                            // Aksi masuk ke dalam halaman browser
                            driver = await goToApp(browser, appHost);
                            await driver.manage().window().maximize();

                            // Aksi menunggu mengisi form login untuk melakukan authentication
                            await loginToApp(driver, user, browser, appHost);
                            
                            // Aksi Sleep
                            await driver.sleep(3000);

                            // Results
                            let userData = await driver.executeScript("return window.localStorage.getItem('user_data')");
                            userData = await JSON.parse(userData);
                            let currentUrl = await driver.getCurrentUrl();

                            // Expect results and add custom message for addtional description
                            customMessages = [
                                userData?.id > 0 ? "Successfully get the data user from local storage ✅" : "No data available from local storage ❌",
                                currentUrl === appHost + '/user' ? 'Successfully go into dashboard user page ✅' : 'Successfully go into dashboard user page ❌' 
                            ]
                            expect(parseInt(userData.id)).to.greaterThan(0);
                            expect(currentUrl).to.equal(appHost + '/user');

                        } catch (error) {
                            expect.fail(error);
                        }


                    });
        
                    it.skip(`User - Check the button pick of reader on reader or councelor page from browser (after logged in) ${browser}`, async () => {
            
                        try {
            
                            driver = await goToApp(browser, appHost);
                            await driver.manage().window().maximize();
                            
                            // Aksi menunggu mengisi form login untuk melakukan authentication
                            await loginToApp(driver, user, browser, appHost);
            
                            // Aksi sleep 
                            await driver.sleep(3000);

                            // Aksi klik logo untuk kembali ke halaman landing page
                            await driver.executeScript(`return document.querySelector('nav.navbar .navbar-brand').click();`);
            
                            // Aksi sleep 
                            await driver.sleep(3000);

                            let modalContent = await driver.executeScript(`return document.querySelector('.modal-content')`);
                            
                            // Aksi sleep 
                            await driver.sleep(4000);

                            if(await modalContent?.isDisplayed()) {
                                await driver.wait(until.elementLocated(By.css('.modal-content')));              
                                await driver.findElement(By.css(".modal-content header button.close")).click();
                            }
                            
                            // Aksi sleep 
                            await driver.sleep(3000);
            
                            // Aksi mengklik menu tab reader
                            await driver.executeScript(`return document.querySelectorAll("ul.navbar-nav li.nav-item a.nav-link a")[2].click();`);
            
                            // Aksi sleep 
                            await driver.sleep(3000);
            
                            // Aksi mengklik menu salah satu reader
                            let userOverview = await driver.executeScript(`return document.querySelectorAll('#user-overview button.action-btn')`);
                            await thrownAnError('Reader is empty', await userOverview.length == 0);
                            await driver.executeScript(`return document.querySelectorAll("#user-overview button.action-btn")[0].click();`);
            
                            // Aksi sleep 
                            await driver.sleep(3000);
            
                            // Expect results and add custom message for addtional description
                            let currentPageUrl = await driver.getCurrentUrl();
            
                            customMessages = [
                                currentPageUrl === appHost + '/user' ? 'Successfully go into user page after clicked button pick on user or councelor page ✅' : 'Failed go into user page ❌',
                            ]
                            expect(currentPageUrl).to.equal(appHost + '/user');
            
                        } catch (error) {
                            expect.fail(error);
                        }
            
            
                    });
        
                    it.skip(`User - Check the active nav link on the header ${browser}`, async () => {
            
                        try {
            
                            driver = await goToApp(browser, appHost);
                            await driver.manage().window().maximize();
                            
                            // Aksi menunggu mengisi form login untuk melakukan authentication
                            await loginToApp(driver, user, browser, appHost);

                            // Aksi sleep 
                            await driver.sleep(3000);

                            // Aksi mengklik salah satu tab menu dari header
                            let navLinks = await driver.executeScript(`return document.querySelectorAll('ul.navbar-nav li.nav-item a.nav-link a');`);
                            await driver.executeScript(`return document.querySelectorAll('ul.navbar-nav li.nav-item a.nav-link a')[${faker.number.int({ min: 0, max: await navLinks.length - 1 })}].click();`);

                            // Aksi sleep 
                            await driver.sleep(3000);

                            // Aksi mengecek active link atau menu tab
                            let textActiveLink = await driver.findElement(By.css('ul.navbar-nav li.nav-item a.nav-link a.nuxt-link-active h6'));
                            await thrownAnError('Text active link is not available', await textActiveLink.isDisplayed() === false);

                            // Expect results and add custom message for addtional description
                            let currentPageUrl = await driver.getCurrentUrl();
                            let currentTextActiveLink = await textActiveLink.getAttribute('innerText').then(text => text.toLowerCase());
                            
                            customMessages = [
                                await textActiveLink.isDisplayed() ? "Text active link is available or displayed ✅" : "Text active link is not available or displayed ❌",
                                currentPageUrl.includes(currentTextActiveLink) && currentTextActiveLink != 'home' ? `Current page now is appropriate with the active link ✅` : `Current page now is not appropriate with the active link ❌`
                            ]
                            expect(await textActiveLink.isDisplayed()).to.equal(true);

                        } catch (error) {
                            expect.fail(error);
                        }
            
            
                    });
                    
                    it.skip(`User - Logout from browser ${browser}`, async () => {

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
                    
                    it.skip(`User - Forgot Password from browser ${browser}`, async () => {

                        try {
                            // Aksi masuk ke dalam halaman browser
                            driver = await goToApp(browser, appHost);
                            await driver.manage().window().maximize();

                            // Aksi klik masuk untuk menuju ke halaman login/authentication
                            let modalContent = await driver.executeScript(`return document.querySelector('.modal-content')`);
                            await driver.sleep(3000);
                            if(await modalContent?.isDisplayed()) {
                                await driver.wait(until.elementLocated(By.css('.modal-content')));              
                                await driver.findElement(By.css(".modal-content header button.close")).click();
                            }

                            await driver.sleep(3000);

                            // Aksi mengklik button login 
                            await driver.findElement(By.css("button.btn-login")).click();

                            // Aksi menunggu halaman authentication
                            await driver.wait(until.elementLocated(By.id("auth")));

                            // Aksi sleep
                            await driver.sleep(3000);

                            // Aksi mengklik button Lupa Password
                            await driver.executeScript(`return document.querySelector("button.forget-password").click();`);

                            // Aksi sleep
                            await driver.sleep(3000);

                            // Aksi Input Data Akun 
                            await driver.findElement(By.css(`input#email`)).sendKeys(user.email, Key.RETURN);
                            await driver.sleep(3000);
                            await driver.executeScript(`return document.querySelector('button[type=submit]').click();`);

                            // Aksi menunggu halaman mengirim link reset password berhasil di kirim
                            await driver.sleep(10000);
                            await driver.wait(until.elementLocated(By.css('form a')));

                            // Expect results and add custom message for addtional description
                            let linkGmail = await driver.executeScript(`return document.querySelector("form a").href`);
                            customMessages = [
                                linkGmail.includes('mail.google.com') ? 'Successfully sent the link of reset password ✅' : 'Failed to send link reset password ❌'
                            ];
                            expect(linkGmail.includes('mail.google.com')).to.equal(true);

                        } catch (error) {
                            expect.fail(error);
                        }

                    });
                    
                    it(`User - Forgot Password V2 from browser ${browser}`, async () => {

                        try {
                            // Aksi masuk ke dalam halaman browser
                            driver = await goToApp(browser, appHost);
                            await driver.manage().window().maximize();

                            // Aksi klik masuk untuk menuju ke halaman login/authentication
                            let modalContent = await driver.executeScript(`return document.querySelector('.modal-content')`);
                            await driver.sleep(3000);
                            if(await modalContent?.isDisplayed()) {
                                await driver.wait(until.elementLocated(By.css('.modal-content')));              
                                await driver.findElement(By.css(".modal-content header button.close")).click();
                            }

                            // Aksi sleep
                            await driver.sleep(3000);

                            // Aksi mengklik button login 
                            await driver.findElement(By.css("button.btn-login")).click();

                            // Aksi menunggu halaman authentication
                            await driver.wait(until.elementLocated(By.id("auth")));

                            // Aksi sleep
                            await driver.sleep(3000);

                            // Aksi mengklik button Lupa Password
                            await driver.executeScript(`return document.querySelector("button.forget-password").click();`);

                            // Aksi sleep
                            await driver.sleep(3000);

                            // Aksi Input Data Akun 
                            await driver.findElement(By.css(`input#email`)).sendKeys(user.email, Key.RETURN);
                            await driver.sleep(3000);
                            await driver.executeScript(`return document.querySelector('button[type=submit]').click();`);

                            // Aksi menunggu halaman mengirim link reset password berhasil di kirim
                            await driver.sleep(15000);

                            // Aksi klik button link untuk menuju kehalaman gmail
                            await driver.executeScript(`return document.querySelector('form a').click();`);

                            // Aksi sleep 
                            await driver.sleep(3000);

                            // Aksi berpindah halaman ke gmail
                            let originalWindow = await driver.getWindowHandle();
                            let windows = await driver.getAllWindowHandles();
                            windows.forEach(async handle => {
                                if (handle !== originalWindow) {
                                    await driver.switchTo().window(handle);
                                }
                            });
                            await driver.wait(async () => (await driver.getAllWindowHandles()).length === 2);
                            
                            // Aksi sleep
                            await driver.sleep(5000);
                            
                            // Aksi mengisi input field email
                            await driver.findElement(By.css("input[type=email]")).sendKeys(user.email);

                            // Aksi sleep
                            await driver.sleep(3000);

                            // Aksi klik button next
                            await driver.findElement(By.css('#identifierNext')).click();
                            
                            // Aksi sleep
                            await driver.sleep(5000);
                            await driver.wait(until.elementLocated(By.css('input[type=password]')));

                            // Aksi mengisi input field password
                            await driver.findElement(By.css("input[type=password]")).sendKeys(user.password);
                            
                            // Aksi sleep
                            await driver.sleep(3000);

                            // Aksi klik button next
                            await driver.findElement(By.css('#passwordNext')).click();
                            
                            // Aksi sleep
                            await driver.sleep(10000);

                            // Aksi mendapatkan td row notif email dari bacatarot
                            let notifEmail = await driver.executeScript(`return Array.from(document.querySelectorAll("table[role=grid] tr td span span")).find(value => value.innerText.includes('Bacatarot'))`)
                            await thrownAnError('Notification reset password in gmail is empty', await notifEmail == null)
                            await driver.sleep(2000);
                            await driver.executeScript(`return Array.from(document.querySelectorAll("table[role=grid] tr td span span")).find(value => value.innerText.includes('Bacatarot')).click();`);

                            // Aksi sleep
                            await driver.sleep(4000);

                            // Aksi scroll bottom body
                            await driver.executeScript('window.scrollTo(0, document.body.scrollHeight)');

                            // Aksi sleep
                            await driver.sleep(3000);

                            // Aksi klik button anchor reset password
                            await driver.executeScript(`return document.querySelector("div[role=listitem][aria-expanded=true] table tr td a").click();`);
                            
                            // Aksi sleep
                            await driver.sleep(10000);

                            // Aksi berpindah halaman ke gmail
                            originalWindow = await driver.getWindowHandle();
                            windows = await driver.getAllWindowHandles();
                            await driver.switchTo().window(await windows[windows.length - 1]);
                            // Aksi sleep
                            await driver.sleep(10000);

                            // Aksi close modal
                            modalContent = await driver.executeScript(`return document.querySelector('.modal-content')`);
                            await driver.sleep(3000);
                            if(await modalContent?.isDisplayed()) {
                                await driver.wait(until.elementLocated(By.css('.modal-content')));              
                                await driver.findElement(By.css(".modal-content header button.close")).click();
                            }
                            
                            // Aksi sleep
                            await driver.sleep(3000);

                            // Aksi klik tombol lanjut reset password
                            await driver.executeScript(`return document.querySelector("#auth span.loading-email").click()`);
                            
                            // Aksi sleep
                            await driver.sleep(3000);
                            
                            // Aksi fill input new password
                            let newPassword = user.password;
                            await driver.findElement(By.id('password')).sendKeys(newPassword);
                            await driver.sleep(1000);
                            await driver.findElement(By.id('konfirmasi-password')).sendKeys(newPassword);
                            await driver.sleep(1000);
                            await driver.executeScript(`return document.querySelector("#auth form button[type=submit]").click()`);
                            
                            // Aksi sleep
                            await driver.sleep(4000);
                            await driver.wait(until.elementLocated(By.css(".cancel-container .cancel a")));

                            // Aksi klik button close
                            await driver.executeScript(`return document.querySelector(".cancel-container .cancel a").click()`);
                            
                            // Aksi sleep
                            await driver.sleep(3000);

                            // Aksi menunggu mengisi form login untuk melakukan authentication
                            await loginToApp(driver, user, browser, appHost);

                            // Aksi sleep
                            await driver.sleep(3000);

                            // Expect results and add custom message for addtional description
                            let userData = await driver.executeScript("return window.localStorage.getItem('user_data')");
                            userData = await JSON.parse(userData);
                            let currentUrl = await driver.getCurrentUrl();

                            // Expect results and add custom message for addtional description
                            customMessages = [
                                userData?.id > 0 ? "Successfully get the data user from local storage ✅" : "No data available from local storage ❌",
                                currentUrl === appHost + '/user' ? 'Successfully go into dashboard user page ✅' : 'Successfully go into dashboard user page ❌' 
                            ]
                            expect(parseInt(userData.id)).to.greaterThan(0);
                            expect(currentUrl).to.equal(appHost + '/user');

                        } catch (error) {
                            expect.fail(error);
                        }

                    });
                    
                    it.skip(`User - Resend Reset Password from browser ${browser}`, async () => {

                        try {
                            // Aksi masuk ke dalam halaman browser
                            driver = await goToApp(browser, appHost);
                            await driver.manage().window().maximize();

                            // Aksi klik masuk untuk menuju ke halaman login/authentication
                            let modalContent = await driver.executeScript(`return document.querySelector('.modal-content')`);
                            await driver.sleep(3000);
                            if(await modalContent?.isDisplayed()) {
                                await driver.wait(until.elementLocated(By.css('.modal-content')));              
                                await driver.findElement(By.css(".modal-content header button.close")).click();
                            }

                            await driver.sleep(3000);

                            // Aksi mengklik button login 
                            await driver.findElement(By.css("button.btn-login")).click();

                            // Aksi menunggu halaman authentication
                            await driver.wait(until.elementLocated(By.id("auth")));

                            // Aksi sleep
                            await driver.sleep(3000);

                            // Aksi mengklik button Lupa Password
                            await driver.executeScript(`return document.querySelector("button.forget-password").click();`);

                            // Aksi sleep
                            await driver.sleep(3000);

                            // Aksi Input Data Akun 
                            await driver.findElement(By.css(`input#email`)).sendKeys(user.email, Key.RETURN);
                            await driver.sleep(3000);
                            await driver.executeScript(`return document.querySelector('button[type=submit]').click();`);

                            // Aksi menunggu halaman mengirim link reset password berhasil di kirim
                            await driver.sleep(10000);
                            await driver.wait(until.elementLocated(By.css('form a')));

                            // Aksi mengklik button resend reset password
                            await driver.executeScript(`return document.querySelector('button[type=submit].orange-active').click();`);

                            // Aksi menunggu halaman mengirim link reset password berhasil di kirim
                            await driver.sleep(10000);
                            await driver.wait(until.elementLocated(By.css('form a')));

                            // Expect results and add custom message for addtional description
                            let linkGmail = await driver.executeScript(`return document.querySelector("form a").href`);
                            customMessages = [
                                linkGmail.includes('mail.google.com') ? 'Successfully sent the link of reset password ✅' : 'Failed to send link reset password ❌'
                            ];
                            expect(linkGmail.includes('mail.google.com')).to.equal(true);

                        } catch (error) {
                            expect.fail(error);
                        }

                    });

                    break;
                
                case 2: 

                    if(browser != 'chrome') {
                        it.skip(`Reader - Update Profile for mobile version from browser ${browser}`, async () => {
    
                            try {
                                // Aksi masuk ke dalam halaman browser
                                driver = await goToApp(browser, appHost, 'mobile');
    
                                // Aksi klik masuk untuk menuju ke halaman login/authentication
                                let modalContent = await driver.executeScript(`return document.querySelector('.modal-content')`);
                                if(await modalContent?.isDisplayed()) {
                                    await driver.wait(until.elementLocated(By.css('.modal-content')));   
                                    await driver.sleep(1000);           
                                    await driver.executeScript(`return document.querySelector('.modal-content header button.close').click`)
                                }
    
                                // Aksi mengklik button login 
                                await driver.sleep(1000);
                                await driver.findElement(By.css("button.navbar-toggler")).click();
                                // Aksi mengecek dropdown navbar item ketika telah mengklik toggler button
                                let dropdownNavbar = await driver.findElement(By.css("ul.navbar-nav"));
                                await thrownAnError('Dropdown navbar item is not available', dropdownNavbar.isDisplayed() === false);
                                await driver.sleep(1000);
                                await driver.executeScript(`return document.querySelectorAll('ul.navbar-nav li.nav-item a.nav-link a')[document.querySelectorAll('ul.navbar-nav li.nav-item a.nav-link a').length - 1].click();`);
                                await driver.sleep(1000);
    
                                // Aksi menunggu halaman authentication
                                await driver.wait(until.elementLocated(By.id("auth")));
    
                                // Aksi Input Data Akun 
                                await driver.wait(until.elementLocated(By.css(`input#email`)));
                                await driver.findElement(By.css(`input#email`)).sendKeys(user.email, Key.RETURN);
                                await driver.findElement(By.css(`input#password`)).sendKeys(user.password, Key.RETURN);
                                // Aksi sleep
                                await driver.sleep(3000);
                                // Aksi mengecek ada warning atau tidak pada saat submit login form
                                let errorElement = await driver.executeScript(`return document.querySelectorAll('p.error');`)
                                if (errorElement.length > 0) await thrownAnError(await driver.executeScript(`return document.querySelector('p.error').innerText;`), errorElement.length > 0);
    
    
                                // Aksi sleep
                                await driver.sleep(5000);
    
                                // Aksi klik button profile
                                await driver.executeScript(`return document.querySelectorAll(".mobile-navigation .row .col a")[document.querySelectorAll(".mobile-navigation .row .col a").length - 1].click()`);
    
                                // Aksi Sleep
                                await driver.sleep(3000);
    
                                // Aksi klik button Atur Profile
                                await driver.executeScript(`return document.querySelectorAll(".setting-item .item h1")[0].click();`);
    
                                // Aksi Sleep
                                await driver.sleep(3000);
    
                                // Aksi klik button Atur Profile
                                await driver.executeScript(`return document.querySelector(".btn-edit-profile").click()`);
    
                                // Aksi sleep
                                await driver.sleep(3000);
    
                                // Fill all input
                                // Generate a random value
                                let inputName = faker.name.lastName();
                                let inputPlaceOfBirth = faker.helpers.arrayElement(['Bandung', 'Malang', 'Jakarta', 'Bekasi', 'Cikarang', 'Cikampek']);
                                let inputPhoneNumber = faker.phone.number('08############');
                                let inputAddress = '123 Street Way';
                                let inputEducation = faker.helpers.arrayElement(['SMP', 'SMK', 'D1', 'D2', 'D3', 'S1']);
                                let inputExperience = 'Belum Ada';
                                await driver.findElement(By.css('input#name')).clear();
                                await driver.findElement(By.css('input#name')).sendKeys(`Reader ${inputName}`);
                                await driver.findElement(By.css('input#place_of_birth')).clear();
                                await driver.findElement(By.css('input#place_of_birth')).sendKeys(inputPlaceOfBirth);
                                // Input DatePicker Start
                                await driver.executeScript(`return document.querySelector(".vdp-datepicker div > input").click()`);
                
                                await driver.wait(async () => {
                                    let listBoxCourse = await driver.findElement(By.css('.vdp-datepicker__calendar'));
                                    return listBoxCourse.isDisplayed();
                                });
                                await driver.sleep(3000);
                                await driver.findElement(By.css('span.day__month_btn')).click();
                                await driver.sleep(3000);
                                await driver.findElement(By.css('span.month__year_btn')).click();
                                await driver.sleep(3000);
                                for (let index = 0; index < 2; index++) {
                                    await driver.executeScript(`return document.querySelectorAll('span.prev')[2].click();`);
                                }
                                await driver.sleep(10000);
                                let selectsYear = await driver.executeScript(`return document.querySelectorAll('span.cell.year')`);
                                await selectsYear[faker.number.int({ min: 0, max: 6 })].click();
                                await driver.sleep(3000);
                                let selectsMonth = await driver.executeScript(`return document.querySelectorAll('span.cell.month')`);
                                await selectsMonth[faker.number.int({ min: 0, max: 10 })].click();
                                await driver.sleep(5000);
                                await driver.executeScript(`return document.querySelectorAll('span.cell.day')[${faker.number.int({ min: 1, max: 28 })}].click()`);
                                await driver.sleep(3000);
                                // Input DatePicker End
                                await driver.executeScript('arguments[0].scrollIntoView()', await driver.findElement(By.css('input#phone_number')));
                                await driver.findElement(By.css('input#phone_number')).clear();
                                await driver.findElement(By.css('input#phone_number')).sendKeys(inputPhoneNumber);
                                await driver.findElement(By.css('input#address')).clear();
                                await driver.findElement(By.css('input#address')).sendKeys(inputAddress);
                                await driver.findElement(By.css('input#education')).clear();
                                await driver.findElement(By.css('input#education')).sendKeys(inputEducation);
                                await driver.findElement(By.css('textarea#experience')).clear();
                                await driver.findElement(By.css('textarea#experience')).sendKeys(inputExperience);
                                let radioGenders = await driver.executeScript(`return document.querySelectorAll('.radio-gender .radio-item')`);
                                await radioGenders[faker.number.int({ min: 0, max: 1 })].click();
                                await driver.sleep(1000);
                                await driver.findElement(By.css('input[type=file]#imgSrc')).sendKeys(path.resolve('./resources/images/profile.png'))
                                // Aksi sleep
                                await driver.sleep(3000);
                                // Get the all value of input & check if the all input is already filled in
                                let isAllFilled = await Promise.all([
                                    await driver.findElement(By.css('input#name')).getAttribute('value'),
                                    await driver.findElement(By.css('input#place_of_birth')).getAttribute('value'),
                                    await driver.findElement(By.css('.vdp-datepicker div > input')).getAttribute('value'),
                                    await driver.findElement(By.css('input#phone_number')).getAttribute('value'),
                                    await driver.findElement(By.css('input#address')).getAttribute('value'),
                                    await driver.findElement(By.css('input#education')).getAttribute('value'),
                                    await driver.findElement(By.css(`input[name="radio-gender"]`)).getAttribute('value'),
                                    await driver.findElement(By.css('textarea#experience')).getAttribute('value'),
                                    await driver.findElement(By.css('input[type=file]#imgSrc')).getAttribute('value'),
                                ]).then(results => results.every(value => value != ''));
    
                                if(isAllFilled) await driver.executeScript(`return document.querySelector('button.btn-simpan').click()`);
                                
                                // Aksi sleep 
                                await driver.sleep(3000);
    
                                // Expect results and add custom message for addtional description
                                let alertSuccess = await driver.executeScript(`return document.querySelector('.toasted.bubble.success');`);
                                customMessages = [
                                    await alertSuccess?.isDisplayed() ? 'Successfully show alert success after updated the profile ✅' : 'Failed to show alert success after updated the profile ❌',
                                    isAllFilled ? 'Successfully fill the input field and update the profile ✅' : 'Failed to fill the input field and update the profile ❌'
                                ];
                                expect(await alertSuccess?.isDisplayed()).to.equal(true);
                                expect(isAllFilled).to.equal(true);
    
                            } catch (error) {
                                expect.fail(error);
                            }
    
    
                        });
                    }

                    // Desktop version
                    it(`Reader - Login from browser ${browser}`, async function() {

                        try {
                            // Aksi masuk ke dalam halaman browser
                            driver = await goToApp(browser, appHost);
                            await driver.manage().window().maximize();

                            // Aksi menunggu mengisi form login untuk melakukan authentication
                            await loginToApp(driver, user, browser, appHost);

                            // Aksi Sleep
                            await driver.sleep(3000);

                            // Results
                            let userData = await driver.executeScript("return window.localStorage.getItem('user_data')");
                            userData = await JSON.parse(userData);
                            let currentUrl = await driver.getCurrentUrl();

                            // Expect results and add custom message for addtional description
                            customMessages = [
                                userData?.id > 0 ? "Successfully get the data reader account from local storage ✅" : "No data available from local storage ❌",
                                currentUrl === appHost + '/reader' ? 'Successfully go into dashboard reader page ✅' : 'Successfully go into dashboard reader page ❌' 
                            ]
                            expect(parseInt(userData.id)).to.greaterThan(0);
                            expect(currentUrl).to.equal(appHost + '/reader');

                        } catch (error) {
                            expect.fail(error);
                        }


                    });
        
                    it(`Reader - Check the button pick of reader on reader or councelor page from browser (after logged in) from ${browser}`, async () => {
            
                        try {
            
                            driver = await goToApp(browser, appHost);
                            await driver.manage().window().maximize();
                            
                            // Aksi menunggu mengisi form login untuk melakukan authentication
                            await loginToApp(driver, user, browser, appHost);
            
                            // Aksi sleep 
                            await driver.sleep(3000);

                            // Aksi klik logo untuk kembali ke halaman landing page
                            await driver.executeScript(`return document.querySelector('nav.navbar .navbar-brand').click();`);
            
                            // Aksi sleep 
                            await driver.sleep(3000);
                            
                            let modalContent = await driver.executeScript(`return document.querySelector('.modal-content')`);

                            // Aksi sleep 
                            await driver.sleep(4000);

                            if(await modalContent?.isDisplayed()) {
                                await driver.wait(until.elementLocated(By.css('.modal-content')));              
                                await driver.findElement(By.css(".modal-content header button.close")).click();
                            }

                            // Aksi sleep 
                            await driver.sleep(3000);
            
                            // Aksi mengklik menu tab reader
                            await driver.executeScript(`return document.querySelectorAll("ul.navbar-nav li.nav-item a.nav-link a")[2].click();`);
            
                            // Aksi sleep 
                            await driver.sleep(3000);
            
                            // Aksi mengklik salah satu reader untuk di pickup
                            let userOverview = await driver.executeScript(`return document.querySelectorAll('#user-overview button.action-btn')`);
                            await thrownAnError('Sorry, the reader is empty', await userOverview.length == 0);
                            await driver.executeScript(`return document.querySelectorAll("#user-overview button.action-btn")[0].click();`);
            
                            // Aksi sleep 
                            await driver.sleep(5000);
            
                            // Expect results and add custom message for addtional description
                            let currentPageUrl = await driver.getCurrentUrl();
                            customMessages = [
                                currentPageUrl === appHost + '/reader' ? 'Successfully go into reader page after clicked button pick on reader or councelor page ✅' : 'Failed go into reader page ❌',
                            ]
                            expect(currentPageUrl).to.equal(appHost + '/reader');
            
                        } catch (error) {
                            expect.fail(error);
                        }
            
            
                    });
                    
                    it(`Reader - Checking if the account is already verified or not from browser ${browser}`, async () => {

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

                            // Aksi klik button Atur Profile
                            await driver.executeScript(`return document.querySelectorAll('img.icon-sm')[1].click();`);
                            
                            // Aksi Sleep
                            await driver.sleep(3000);

                            // Aksi checking icon checklist of the email input
                            let iconVerifiedEmail = await driver.executeScript(`return document.querySelector('img.mx-3').src`);
                            await thrownAnError('The reader is still not verified yet', await iconVerifiedEmail.includes('x_red.svg'));

                            // Aksi sleep
                            await driver.sleep(5000);

                            // Expect results and add custom message for addtional description
                            customMessages = [
                                !iconVerifiedEmail.includes('x_red.svg') ? 'The reader is already verified ✅' : 'The reader is still not verified yet ❌',
                            ];
                            expect(!iconVerifiedEmail.includes('x_red.svg')).to.equal(true);

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
                            await driver.sleep(5000);

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
                    
                    it(`Reader - Update Profile from browser ${browser}`, async () => {

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

                            // Aksi klik button Atur Profile
                            await driver.executeScript(`return document.querySelectorAll('img.icon-sm')[1].click();`);

                            // Aksi sleep
                            await driver.sleep(3000);

                            // Fill all input
                            // Generate a random value
                            let inputName = faker.name.lastName();
                            let inputPlaceOfBirth = faker.helpers.arrayElement(['Bandung', 'Malang', 'Jakarta', 'Bekasi', 'Cikarang', 'Cikampek']);
                            let inputPhoneNumber = faker.phone.number('08############');
                            let inputAddress = '123 Street Way';
                            let inputEducation = faker.helpers.arrayElement(['SMP', 'SMK', 'D1', 'D2', 'D3', 'S1']);
                            let inputExperience = 'Belum Ada';
                            await driver.findElement(By.css('input#name')).clear();
                            await driver.findElement(By.css('input#name')).sendKeys(`Reader ${inputName}`);
                            await driver.findElement(By.css('input#place_of_birth')).clear();
                            await driver.findElement(By.css('input#place_of_birth')).sendKeys(inputPlaceOfBirth);
                            // Input DatePicker Start
                            await driver.executeScript(`return document.querySelector(".vdp-datepicker div > input").click()`);
            
                            await driver.wait(async () => {
                                let listBoxCourse = await driver.findElement(By.css('.vdp-datepicker__calendar'));
                                return listBoxCourse.isDisplayed();
                            });
                            await driver.sleep(3000);
                            await driver.findElement(By.css('span.day__month_btn')).click();
                            await driver.sleep(3000);
                            await driver.findElement(By.css('span.month__year_btn')).click();
                            await driver.sleep(3000);
                            for (let index = 0; index < 2; index++) {
                                await driver.executeScript(`return document.querySelectorAll('span.prev')[2].click();`);
                            }
                            await driver.sleep(10000);
                            let selectsYear = await driver.executeScript(`return document.querySelectorAll('span.cell.year')`);
                            await selectsYear[faker.number.int({ min: 0, max: 6 })].click();
                            await driver.sleep(3000);
                            let selectsMonth = await driver.executeScript(`return document.querySelectorAll('span.cell.month')`);
                            await selectsMonth[faker.number.int({ min: 0, max: 10 })].click();
                            await driver.sleep(5000);
                            await driver.executeScript(`return document.querySelectorAll('span.cell.day')[${faker.number.int({ min: 1, max: 28 })}].click()`);
                            await driver.sleep(3000);
                            // Input DatePicker End
                            await driver.executeScript('arguments[0].scrollIntoView()', await driver.findElement(By.css('input#phone_number')));
                            await driver.findElement(By.css('input#phone_number')).clear();
                            await driver.findElement(By.css('input#phone_number')).sendKeys(inputPhoneNumber);
                            await driver.findElement(By.css('input#address')).clear();
                            await driver.findElement(By.css('input#address')).sendKeys(inputAddress);
                            await driver.findElement(By.css('input#education')).clear();
                            await driver.findElement(By.css('input#education')).sendKeys(inputEducation);
                            await driver.findElement(By.css('textarea#experience')).clear();
                            await driver.findElement(By.css('textarea#experience')).sendKeys(inputExperience);
                            let radioGenders = await driver.executeScript(`return document.querySelectorAll('.radio-gender .radio-item')`);
                            await radioGenders[faker.number.int({ min: 0, max: 1 })].click();
                            // Aksi sleep
                            await driver.sleep(3000);
                            // Get the all value of input & check if the all input is already filled in
                            let isAllFilled = await Promise.all([
                                await driver.findElement(By.css('input#name')).getAttribute('value'),
                                await driver.findElement(By.css('input#place_of_birth')).getAttribute('value'),
                                await driver.findElement(By.css('.vdp-datepicker div > input')).getAttribute('value'),
                                await driver.findElement(By.css('input#phone_number')).getAttribute('value'),
                                await driver.findElement(By.css('input#address')).getAttribute('value'),
                                await driver.findElement(By.css('input#education')).getAttribute('value'),
                                await driver.findElement(By.css(`input[name="radio-gender"]`)).getAttribute('value'),
                                await driver.findElement(By.css('textarea#experience')).getAttribute('value'),
                            ]).then(results => results.every(value => value != ''));

                            if(isAllFilled) await driver.executeScript(`return document.querySelector('button.btn-simpan').click()`);

                            // Aksi sleep 
                            await driver.sleep(3000);

                            // Expect results and add custom message for addtional description
                            let alertSuccess = await driver.executeScript(`return document.querySelector('.bubble.success');`);
                            customMessages = [
                                await alertSuccess?.isDisplayed() ? 'Successfully show alert success after updated the profile ✅' : 'Failed to show alert success after updated the profile ❌',
                                isAllFilled ? 'Successfully fill the input field and update the profile ✅' : 'Failed to fill the input field and update the profile ❌'
                            ];
                            expect(await alertSuccess?.isDisplayed()).to.equal(true);
                            expect(isAllFilled).to.equal(true);

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

                            // Aksi klik button Atur Profile
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
                            let alertWarning = await driver.executeScript(`return document.querySelector('.toasted.bubble.warning')`);
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
                                currentUrl === appHost + '/reader' ? 'Successfully go into dashboard reader page ✅' : 'Successfully go into dashboard reader page ❌' 
                            ]
                            expect(newPassword).to.eq(inputValuePassword);
                            expect(parseInt(userData.id)).to.greaterThan(0);
                            expect(currentUrl).to.equal(appHost + '/reader');

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
                            
                            // Aksi Sleep
                            await driver.sleep(3000);

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