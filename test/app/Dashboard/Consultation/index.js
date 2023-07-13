import { describe, afterEach, before } from 'mocha';
import { Builder, By, Key, until, logging, Capabilities } from 'selenium-webdriver';
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

describe("Booking", () => {
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
                    it(`User - Join the consultation or meeting from browser ${browser}`, async () => {

                        try {

                            // Aksi masuk ke dalam halaman browser
                            driver = await goToApp(browser, appHost);
                            await driver.manage().window().maximize();

                            // Aksi menunggu mengisi form login untuk melakukan authentication
                            await loginToApp(driver, user, browser, appHost);

                            // Aksi Sleep
                            await driver.sleep(3000);

                            // Aksi klik menu tab consultation
                            await driver.executeScript(`return document.querySelectorAll('ul.navbar-nav li.nav-item a a')[1].click();`);

                            // Aksi Sleep
                            await driver.sleep(5000);

                            // Aksi scroll to bottom of consultation
                            await driver.executeScript(`return document.querySelector('.scrollbar').scrollTo(0, document.querySelector('.scrollbar').scrollHeight)`);

                            // Aksi Sleep
                            await driver.sleep(3000);

                            // Aksi memilih salah satu consultation yang sedang berlangsung
                            let startConsultation = await driver.executeScript(`return Array.from(document.querySelectorAll("#user-chat")).find(value => value.querySelector('.d-inline button.start-btn')).querySelector('button.start-btn')`);
                            await thrownAnError('There was no consultation starting', await startConsultation == null);
                            await driver.executeScript(`return Array.from(document.querySelectorAll("#user-chat")).find(value => value.querySelector('.d-inline button.start-btn')).querySelector('button.start-btn').click();`);
                            await driver.sleep(3000);
                            await driver.executeScript(`return document.querySelector('#start-read .action-btn').click()`);
                            
                            // Aksi Sleep
                            await driver.sleep(3000);

                            // Aksi berpindah halaman ke zoom
                            const originalWindow = await driver.getWindowHandle();
                            const windows = await driver.getAllWindowHandles();
                            windows.forEach(async handle => {
                                if (handle !== originalWindow) {
                                    await driver.switchTo().window(handle);
                                }
                            });
                            
                            // Aksi Sleep
                            await driver.sleep(10000);

                            // Expect results and add custom message for addtional description
                            const currentUrl = await driver.getCurrentUrl();
                            const hashSuccessZoom = await driver.executeScript(`return window.location.hash`);
                            customMessages = [
                                currentUrl.includes('https://us05web.zoom.us/') && await hashSuccessZoom.includes('success') ? 'Successfully directed to zoom meeting ✅' : 'Failed directed to zoom meeting ❌'
                            ]
                            expect(currentUrl).to.contain('https://us05web.zoom.us/')
                            expect(hashSuccessZoom).to.contain('success')
                            
                        } catch (error) {
                            expect.fail(error);
                        }

                    });
                    
                    it(`User - End the meeting or consultation  from browser ${browser}`, async () => {

                        try {

                            // Aksi masuk ke dalam halaman browser
                            driver = await goToApp(browser, appHost);
                            await driver.manage().window().maximize();

                            // Aksi menunggu mengisi form login untuk melakukan authentication
                            await loginToApp(driver, user, browser, appHost);

                            // Aksi Sleep
                            await driver.sleep(3000);

                            // Aksi klik menu tab consultation
                            await driver.executeScript(`return document.querySelectorAll('ul.navbar-nav li.nav-item a a')[1].click();`);

                            // Aksi Sleep
                            await driver.sleep(5000);

                            // Aksi scroll to bottom of consultation
                            await driver.executeScript(`return document.querySelector('.scrollbar').scrollTo(0, document.querySelector('.scrollbar').scrollHeight)`);

                            // Aksi Sleep
                            await driver.sleep(3000);

                            // Aksi memilih salah satu consultation yang sedang berlangsung
                            let startConsultation = await driver.executeScript(`return Array.from(document.querySelectorAll("#user-chat"))?.find(value => value.querySelector('.d-inline button.start-btn'))?.querySelector('button.start-btn')`) ?? null;
                            await thrownAnError('There was no consultation starting', await startConsultation == null);
                            await driver.sleep(2000);
                            await startConsultation.click();
                            await driver.sleep(2000);
                            let readerName = await driver.executeScript(`
                                var name = document.querySelector("#start-read .action-container .info-container h3.name").innerText;
                                return name;
                            `)
                            let timeConsultation = await driver.executeScript(`
                                var time = document.querySelector("#start-read .action-container .info-container p.time").innerText;
                                return time.substring(0, time.lastIndexOf('•') - 1).replace('.', ':');
                            `)
                            await driver.sleep(2000);
                            let endButton = await driver.executeScript(`return document.querySelector('#start-read #orange-button button:not(.disabled)')`) ?? null;
                            await thrownAnError("Button 'Selesai' is still disabled", await endButton == null);
                            await driver.sleep(2000);
                            await endButton.click();
                            
                            // Aksi Sleep
                            await driver.sleep(15000);
                            
                            // Aksi scroll to bottom of consultation
                            await driver.executeScript(`return document.querySelector('.scrollbar').scrollTo(0, document.querySelector('.scrollbar').scrollHeight)`);

                            // Aksi Sleep
                            await driver.sleep(3000);

                            // Expect results and add custom message for addtional description
                            let endedConsultation = await driver.executeScript(`
                                return Array.from(document.querySelectorAll('#user-chat')).find(value => {
                                    const button = value.querySelector('button.action-btn');
                                    const innerText = value.innerText;
                                    return innerText.includes("${readerName}") && innerText.includes("${timeConsultation}");
                                });
                            `);
                            customMessages = [
                                await endedConsultation != null ? 'Successfully ended the session of consultation ✅' : 'Failed to end the session of consultation ❌'
                            ];
                            expect(await endedConsultation).to.not.equal(null);
                            
                        } catch (error) {
                            expect.fail(error);
                        }

                    });

                    break;

                case 2:
                    it(`Reader - Join the consultation or meeting from browser ${browser}`, async () => {

                        try {

                            // Aksi masuk ke dalam halaman browser
                            driver = await goToApp(browser, appHost);
                            await driver.manage().window().maximize();

                            // Aksi menunggu mengisi form login untuk melakukan authentication
                            await loginToApp(driver, user, browser, appHost);

                            // Aksi Sleep
                            await driver.sleep(5000);

                            // Aksi scroll to bottom of consultation
                            await driver.executeScript(`return document.querySelector('.scrollbar').scrollTo(0, document.querySelector('.scrollbar').scrollHeight)`);

                            // Aksi Sleep
                            await driver.sleep(3000);

                            // Aksi memilih salah satu consultation yang sedang berlangsung
                            let startConsultation = await driver.executeScript(`return Array.from(document.querySelectorAll("#user-chat")).find(value => value.querySelector('.d-inline button.start-btn')).querySelector('button.start-btn')`);
                            await thrownAnError('There was no consultation starting', await startConsultation == null);
                            await driver.executeScript(`return Array.from(document.querySelectorAll("#user-chat")).find(value => value.querySelector('.d-inline button.start-btn')).querySelector('button.start-btn').click()`);
                            await driver.sleep(3000);
                            await driver.executeScript(`return document.querySelector('#start-read .action-btn').click()`);
                            
                            // Aksi Sleep
                            await driver.sleep(3000);

                            // Aksi berpindah halaman ke zoom
                            const originalWindow = await driver.getWindowHandle();
                            const windows = await driver.getAllWindowHandles();
                            windows.forEach(async handle => {
                                if (handle !== originalWindow) {
                                    await driver.switchTo().window(handle);
                                }
                            });
                            
                            // Aksi Sleep
                            await driver.sleep(10000);

                            // Expect results and add custom message for addtional description
                            const currentUrl = await driver.getCurrentUrl();
                            const hashSuccessZoom = await driver.executeScript(`return window.location.hash`);
                            customMessages = [
                                currentUrl.includes('https://us05web.zoom.us/') && await hashSuccessZoom.includes('success') ? 'Successfully directed to zoom meeting ✅' : 'Failed directed to zoom meeting ❌'
                            ]
                            expect(currentUrl).to.contain('https://us05web.zoom.us/')
                            expect(hashSuccessZoom).to.contain('success')
                            
                        } catch (error) {
                            expect.fail(error);
                        }

                    });

                    it(`Reader - End the meeting or consultation from browser ${browser}`, async () => {

                        try {

                            // Aksi masuk ke dalam halaman browser
                            driver = await goToApp(browser, appHost);
                            await driver.manage().window().maximize();

                            // Aksi menunggu mengisi form login untuk melakukan authentication
                            await loginToApp(driver, user, browser, appHost);

                            // Aksi Sleep
                            await driver.sleep(5000);

                            // Aksi scroll to bottom of consultation
                            await driver.executeScript(`return document.querySelector('.scrollbar').scrollTo(0, document.querySelector('.scrollbar').scrollHeight)`);

                            // Aksi Sleep
                            await driver.sleep(3000);

                            // Aksi memilih salah satu consultation yang sedang berlangsung
                            let startConsultation = await driver.executeScript(`return Array.from(document.querySelectorAll("#user-chat"))?.find(value => value.querySelector('.d-inline button.start-btn'))?.querySelector('button.start-btn')`) ?? null;
                            await thrownAnError('There was no consultation starting', await startConsultation == null);
                            await driver.sleep(2000);
                            await startConsultation.click();
                            await driver.sleep(2000);
                            let endButton = await driver.executeScript(`return document.querySelector('#start-read #orange-button button:not(.disabled)')`) ?? null;
                            await thrownAnError("Button 'Selesai' is still disabled", await endButton == null);
                            await driver.sleep(2000);
                            await endButton.click();
                            await driver.sleep(2000);
                            // Aksi klik button konfirmasi pembatalan pemesanan
                            await driver.executeScript(`return document.querySelectorAll(".agreement-modal .wrapper .option p")[1].click()`);
                            
                            // Aksi Sleep
                            await driver.sleep(15000);

                            // Expect results and add custom message for addtional description
                            let modalConfirmEndSession = await driver.executeScript(`return document.querySelector('.modal-body')`);
                            customMessages = [
                                await modalConfirmEndSession === null ? 'Successfully ended the session consultation of user ✅' : 'Failed to end the session consultation of user ❌'
                            ]
                            expect(await modalConfirmEndSession).to.equal(null);
                            
                        } catch (error) {
                            expect.fail(error);
                        }

                    });

                    it(`Reader - Accept the request of consultation from browser ${browser}`, async () => {

                        try {
                            driver = await goToApp(browser, appHost);
                            await driver.manage().window().maximize();

                            // Aksi menunggu mengisi form login untuk melakukan authentication
                            await loginToApp(driver, user, browser, appHost);

                            // Aksi sleep
                            await driver.sleep(3000);
                            
                            // Aksi klik menu tab notification
                            await driver.executeScript(`return document.querySelectorAll('ul.navbar-nav li.nav-item a a')[2].click();`);

                            // Aksi sleep
                            await driver.sleep(3000);

                            // Aksi klik tab request
                            await driver.executeScript(`return document.querySelectorAll(".notification-wrapper h1.tab-title")[1].click()`);
                                                        
                            // Aksi sleep
                            await driver.sleep(3000);

                            // Aksi memilih salah satu request yang tersedia
                            let notificationCard = await driver.executeScript(`return document.querySelectorAll('#notification-card')`);
                            await thrownAnError('Request of consultation is empty', await notificationCard.length === 0);
                            let randomIndexNotification = faker.number.int({ min: 0, max: await notificationCard.length - 1 });
                            await driver.sleep(1000);
                            let specializationConsultation = await driver.executeScript(`return document.querySelectorAll('#notification-card')[${randomIndexNotification}].querySelector('.specialization').innerText`);
                            await driver.executeScript(`return document.querySelectorAll("#notification-card")[${randomIndexNotification}].querySelector(".action-container .acc").click()`);
                            
                            // Aksi sleep
                            await driver.sleep(3000);
                            
                            // Aksi klik tab umum
                            await driver.executeScript(`return document.querySelectorAll(".notification-wrapper h1.tab-title")[0].click()`);
                            let spinnerLocator = By.className('v-spinner');
                            await driver.wait(until.elementLocated(spinnerLocator));
                            await driver.wait(until.stalenessOf(driver.findElement(spinnerLocator)));

                            // Aksi sleep
                            await driver.sleep(3000);

                            // Aksi mengecek request consultation yang telah di terima sebelumnya
                            let acceptedConsultation = await driver.executeScript(`return Array.from(document.querySelectorAll('#notification-card .specialization')).filter(value => value.innerText === "${specializationConsultation}")`);
                            customMessages = [
                                await acceptedConsultation.length > 0 ? "The session of consultation successfully accepted ✅" : "The session of consultation failed to accept ❌"
                            ]
                            expect(await acceptedConsultation.length > 0).to.equal(true);

                        } catch (error) {
                            expect.fail(error);
                        }


                    });
                    
                    it(`Reader - Decline the request of consultation from browser ${browser}`, async () => {

                        try {
                            driver = await goToApp(browser, appHost);
                            await driver.manage().window().maximize();

                            // Aksi menunggu mengisi form login untuk melakukan authentication
                            await loginToApp(driver, user, browser, appHost);

                            // Aksi sleep
                            await driver.sleep(3000);
                            
                            // Aksi klik menu tab notification
                            await driver.executeScript(`return document.querySelectorAll('ul.navbar-nav li.nav-item a a')[2].click();`);

                            // Aksi sleep
                            await driver.sleep(3000);

                            // Aksi klik tab request
                            await driver.executeScript(`return document.querySelectorAll(".notification-wrapper h1.tab-title")[1].click()`);
                            
                            // Aksi sleep
                            await driver.sleep(3000);

                            // Aksi memilih salah satu request yang tersedia
                            let notificationCard = await driver.executeScript(`return document.querySelectorAll('#notification-card')`);
                            await thrownAnError('Request of consultation is empty', await notificationCard.length === 0);
                            let randomIndexNotification = faker.number.int({ min: 0, max: await notificationCard.length - 1 });
                            await driver.sleep(1000);
                            let specializationConsultation = await driver.executeScript(`return document.querySelectorAll('#notification-card')[${randomIndexNotification}].querySelector('.specialization').innerText`);
                            await driver.executeScript(`return document.querySelectorAll("#notification-card")[${randomIndexNotification}].querySelector(".action-container .reject").click()`);
                            
                            // Aksi sleep
                            await driver.sleep(3000);

                            // Aksi mengisi form reject the consultation
                            await driver.executeScript(`return document.querySelector(".custom-radio input[type=radio]").checked = true`)
                            await driver.sleep(1000);
                            await driver.findElement(By.css('.modal-body .my-card textarea#my-textarea')).sendKeys(faker.lorem.sentences());
                            await driver.sleep(2000);
                            await driver.executeScript(`return document.querySelector('.modal-body .action-container button.approve').click()`);
                            await driver.sleep(2000);
                            await driver.executeScript(`return document.querySelectorAll('.agreement-modal .wrapper .option p')[1].click()`);
                            
                            // Aksi sleep
                            await driver.sleep(3000);
                            
                            // Aksi klik tab umum
                            await driver.executeScript(`return document.querySelectorAll(".notification-wrapper h1.tab-title")[0].click()`);
                            let spinnerLocator = By.className('v-spinner');
                            await driver.wait(until.elementLocated(spinnerLocator));
                            await driver.wait(until.stalenessOf(driver.findElement(spinnerLocator)));

                            // Aksi sleep
                            await driver.sleep(3000);

                            // Aksi mengecek request consultation yang telah di terima sebelumnya
                            let rejectedConsultation = await driver.executeScript(`return Array.from(document.querySelectorAll('#notification-card .specialization')).filter(value => value.innerText === "${specializationConsultation}")`);
                            customMessages = [
                                await rejectedConsultation.length > 0 ? "The session of consultation successfully rejected ✅" : "The session of consultation failed to reject ❌"
                            ]
                            expect(await rejectedConsultation.length > 0).to.equal(true);

                        } catch (error) {
                            expect.fail(error);
                        }


                    });
                    
                    it(`Reader - See the details of request consultation from browser ${browser}`, async () => {

                        try {
                            driver = await goToApp(browser, appHost);
                            await driver.manage().window().maximize();

                            // Aksi menunggu mengisi form login untuk melakukan authentication
                            await loginToApp(driver, user, browser, appHost);

                            // Aksi sleep
                            await driver.sleep(3000);
                            
                            // Aksi klik menu tab notification
                            await driver.executeScript(`return document.querySelectorAll('ul.navbar-nav li.nav-item a a')[2].click();`);

                            // Aksi sleep
                            await driver.sleep(3000);

                            // Aksi klik tab request
                            await driver.executeScript(`return document.querySelectorAll(".notification-wrapper h1.tab-title")[1].click()`);
                            
                            // Aksi sleep
                            await driver.sleep(3000);

                            // Aksi memilih salah satu request yang tersedia
                            let notificationCard = await driver.executeScript(`return document.querySelectorAll('#notification-card')`);
                            await thrownAnError('Request of consultation is empty', await notificationCard.length === 0);
                            await driver.executeScript(`return document.querySelectorAll('#notification-card')[0].querySelector('.btn-detail').click();`);
                            
                            // Aksi sleep
                            await driver.sleep(3000);

                            // Expect results and add custom message for addtional description
                            let bookingDetails = await driver.findElement(By.css('.booking-detail'));
                            customMessages = [
                                await bookingDetails.isDisplayed() ? 'Successfully get the details information about request consultation of user ✅' : 'Failed to get the details information about request of user ❌'
                            ]
                            expect(await bookingDetails.isDisplayed()).to.equal(true);

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