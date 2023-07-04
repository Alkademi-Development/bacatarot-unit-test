import { describe, afterEach } from 'mocha';
import { By, until } from 'selenium-webdriver';
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

describe("Dashboard", () => {
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
            const name = userAccount[2];
            const kind = parseInt(userAccount[3]);

            let user = { name, email, password, kind };

            switch (user.kind) {
                case 1:
                    it(`User - Search of reader on home page dashboard from browser ${browser}`, async () => {

                        try {
                            // Aksi masuk ke dalam halaman browser
                            driver = await goToApp(browser, appHost);
                            await driver.manage().window().maximize();

                            // Aksi menunggu mengisi form login untuk melakukan authentication
                            await loginToApp(driver, user, browser, appHost);

                            // Aksi sleep
                            await driver.sleep(5000);

                            // Aksi mengecek apakah reader tersedia atau tidak
                            let readerList = await driver.executeScript(`return document.querySelectorAll('#user-list h1.username')`);
                            await thrownAnError('Reader is not available now', await readerList.length === 0);
                            
                            // Aksi mengklik button search
                            await driver.executeScript(`return document.querySelector("button.search-button > div").click();`);
                            
                            // Aksi sleep
                            await driver.sleep(5000);
                            
                            // Aksi menunggu modal muncul
                            let modalContent = await driver.executeScript(`return document.querySelector('.modal-content')`);
                            let readersName = [];
                            let readerSearch = '';
                            if(await modalContent.isDisplayed()) {
                                // Aksi sleep
                                await driver.sleep(5000);
                                readerList = await driver.executeScript(`return document.querySelectorAll('.modal-content div#user-list h1.username')`);
                                // Aksi sleep
                                await driver.sleep(5000);
                                if(await readerList.length > 0) {
                                    for (let index = 0; index < await readerList.length; index++) {
                                        readersName.push(await readerList[index].getAttribute('innerText'));
                                    }
                                    // Aksi sleep
                                    await driver.sleep(3000);
                                    readerSearch = await readersName[faker.number.int({ min: 0, max: await readersName?.length - 1 })];
                                    // Aksi sleep
                                    await driver.sleep(5000);
                                    await driver.findElement(By.css('form > input')).sendKeys(readerSearch);
                                    let formSearch = await driver.findElement(By.css('form'));
                                    await driver.executeScript("arguments[0].addEventListener('submit', function(e) { e.preventDefault(); });", formSearch);
                                    await formSearch.submit();
                                }
                                await thrownAnError('Reader is not available now on modal search reader', await readerList.length === 0);
                            }
                            await thrownAnError('Sorry modal content is not available', await modalContent.isDisplayed() == false);

                            // Aksi mendapatkan kembali data reader saat setelah mencari / mengetik nama reader di input search
                            readerList = await driver.executeScript(`return document.querySelectorAll('div#user-list h1.username')`);
                            let findReader = [];
                            for (let index = 0; index < await readerList.length; index++) {
                                if(await readerList[index].getAttribute('innerText') === readerSearch) findReader.push(readerList[index]);
                            }

                            // Expect results and add custom message for addtional description
                            const currentUrl = await driver.getCurrentUrl();
                            customMessages = [
                                findReader.length > 0 ? "Successfully got the results search of reader ✅" : "No results found for search reader ❌"
                            ];
                            expect(findReader.length).to.greaterThan(0);
                        } catch (error) {
                            expect.fail(error);
                        }


                    });

                    break;
                
                case 2: 
                    it(`Reader - Turn on the schedule per day of consultation from browser ${browser}`, async function() {

                        try {
                            // Aksi masuk ke dalam halaman browser
                            driver = await goToApp(browser, appHost);
                            await driver.manage().window().maximize();

                            // Aksi menunggu mengisi form login untuk melakukan authentication
                            await loginToApp(driver, user, browser, appHost);

                            // Aksi Sleep
                            await driver.sleep(3000);

                            // Aksi klik button profile
                            await driver.executeScript(`return document.querySelectorAll("ul.navbar-nav li.nav-item a a")[3].click()`);

                            // Aksi Sleep
                            await driver.sleep(3000);

                            // Aksi klik button Atur Profile
                            await driver.executeScript(`return document.querySelectorAll('img.icon-sm')[2].click();`);
                            
                            // Aksi Sleep
                            await driver.sleep(3000);

                            // Mengaktifkan salah satu jadwal per hari konsultasi
                            let schedulesOff = await driver.executeScript(`return document.querySelectorAll('p.time.off')`);
                            await thrownAnError('Sorry, all the schedules is already active or on', await schedulesOff.length === 0);

                            // Aksi Sleep
                            await driver.sleep(3000);

                            // Aksi mengklik salah satu jadwal yg msh off
                            let indexScheduleCard = faker.number.int({ min: 0, max: await schedulesOff.length - 1 });
                            await driver.executeScript(`return document.querySelectorAll('p.time.off')[${indexScheduleCard}].parentNode.parentNode.parentNode.querySelector(".add").click();`);
                            
                            // Aksi Sleep
                            await driver.sleep(3000);

                            // Aksi klik turn on the schedule
                            await driver.executeScript(`return document.querySelectorAll('.circle-input')[1].click();`);

                            // Aksi Sleep
                            await driver.sleep(3000);

                            // Aksi klik tombol add time untuk menambakah jadwal waktu konsultasi
                            await driver.executeScript(`return document.querySelector(".wrapper .add").click()`);

                            // Aksi sleep
                            await driver.sleep(3000);

                            // Aksi klik button simpan untuk mengaktifkan jadwal waktu 
                            await driver.executeScript(`return document.querySelector(".button-container #orange-button button.default").click()`);

                            // Aksi sleep
                            await driver.sleep(5000);

                            // Results
                            let isActiveSchedule = await driver.executeScript(`return document.querySelectorAll("p.time")[${indexScheduleCard}].classList.contains('off')`);

                            // Expect results and add custom message for addtional description
                            customMessages = [
                                !isActiveSchedule ? 'Successfully turn on the schedule per day ✅' : 'Failed to turn on the schedule per day ❌'
                            ];
                            expect(!isActiveSchedule).to.eq(true);


                        } catch (error) {
                            expect.fail(error);
                        }


                    });
                    
                    it(`Reader - Turn off the schedule per day of consultation from browser ${browser}`, async function() {

                        try {
                            // Aksi masuk ke dalam halaman browser
                            driver = await goToApp(browser, appHost);
                            await driver.manage().window().maximize();

                            // Aksi menunggu mengisi form login untuk melakukan authentication
                            await loginToApp(driver, user, browser, appHost);

                            // Aksi Sleep
                            await driver.sleep(3000);

                            // Aksi klik button profile
                            await driver.executeScript(`return document.querySelectorAll("ul.navbar-nav li.nav-item a a")[3].click()`);

                            // Aksi Sleep
                            await driver.sleep(3000);

                            // Aksi klik button Atur Profile
                            await driver.executeScript(`return document.querySelectorAll('img.icon-sm')[2].click();`);
                            
                            // Aksi Sleep
                            await driver.sleep(3000);

                            // Mengaktifkan salah satu jadwal per hari konsultasi
                            let schedulesOn = await driver.executeScript(`return document.querySelectorAll('p.time:not(.off)');`);
                            await thrownAnError('Sorry, all the schedules is off', await schedulesOn.length === 0);
                            
                            // Aksi Sleep
                            await driver.sleep(3000);

                            // Aksi mengklik salah satu jadwal yg msh off
                            let indexScheduleOn = faker.number.int({ min: 0, max: await schedulesOn.length - 1 });
                            await driver.executeScript(`return document.querySelectorAll('p.time:not(.off)')[${indexScheduleOn}].parentElement.parentElement.parentElement.parentElement.querySelector(".add").click();`);
                            
                            // Aksi Sleep
                            await driver.sleep(3000);

                            // Aksi klik turn on the schedule
                            await driver.executeScript(`return document.querySelectorAll('.circle-input')[1].click();`);

                            // Aksi Sleep
                            await driver.sleep(3000);

                            // Aksi klik button delete
                            await driver.executeScript(`return document.querySelector('button#danger-button').click();`);
                            
                            // Aksi Sleep
                            await driver.sleep(3000);

                            // Aksi mengecek jadwal schedulenya telah berubah menjadi off
                            let scheduleOnStatus = await driver.executeScript(`return document.querySelectorAll('p.time')[${indexScheduleOn}].classList.contains('off')`);
                            // Aksi Sleep
                            await driver.sleep(3000);
                            await thrownAnError('Sorry, the schedule status is still on', await scheduleOnStatus === false);
                            
                            // Aksi Sleep
                            await driver.sleep(3000);

                            // Expect results and add custom message for addtional description
                            customMessages = [
                                await scheduleOnStatus ? 'Successfully turn off the schedule per day ✅' : 'Failed to turn off the schedule per day ❌'
                            ];
                            expect(await scheduleOnStatus).to.eq(true);


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
                                userData?.id > 0 ? "Successfully get the data from local storage ✅" : "No data available from local storage ❌",
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