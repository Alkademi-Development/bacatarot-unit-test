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

describe("Schedule", () => {
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
            const kind = parseInt(userAccount[2]);

            let user = { email, password, kind };

            switch (user.kind) {
                case 1:

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

                            // Aksi klik button Atur Jadwal
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
                    
                    it(`Reader - Determine the time schedule of consultation from browser ${browser}`, async function() {

                        try {
                            // Aksi masuk ke dalam halaman browser
                            driver = await goToApp(browser, appHost);
                            await driver.manage().window().maximize();

                            // Aksi menunggu mengisi form login untuk melakukan authentication
                            await loginToApp(driver, user, browser, appHost);
                            
                            // Aksi Sleep
                            await driver.sleep(3000);

                            // Aksi mengklik tab menu profile reader
                            await driver.executeScript(`return document.querySelectorAll("ul.navbar-nav li.nav-item a.nav-link a")[document.querySelectorAll("ul.navbar-nav li.nav-item").length - 1].click();`);
                            
                            // Aksi Sleep
                            await driver.sleep(2000);

                            // Aksi mengklik tab Atur Jadwal
                            await driver.executeScript(`return document.querySelectorAll('img.icon-sm')[2].click();`);

                            // Aksi Sleep
                            await driver.sleep(2000);

                            // Aksi seleksi jadwal
                            let scheduleCards = await driver.executeScript(`return document.querySelectorAll('.schedule-card')`);
                            let indexScheduleCard = faker.number.int({ min: 0, max: await scheduleCards.length - 1 });
                            let scheduleTime, scheduleTimeStart, scheduleTimeEnd, newScheduleTime;

                            scheduleTime = await scheduleCards[indexScheduleCard].findElement(By.css('p.time'));
                                
                            // Aksi klik button edit schedule
                            await scheduleCards[indexScheduleCard].findElement(By.css('div.add')).click();
                            
                            if(await scheduleTime.getAttribute('innerText') === 'OFF') {


                                // Aksi Sleep
                                await driver.sleep(2000);

                                // Aksi klik button circle untuk activate schedule
                                await driver.executeScript(`return document.querySelectorAll('.circle-input')[1].click();`);
                                
                                // Aksi Sleep
                                await driver.sleep(2000);
                                
                                // Aksi klik button edit schedule
                                await driver.executeScript(`return document.querySelector(".modal-body .add").click()`);
                                
                                // Aksi Sleep
                                await driver.sleep(2000);

                                // Aksi memilih jadwal yang di inginkan
                                let times = await driver.findElements(By.css(".modal-body .no-pd input.display-time"));
                                let startTime = await times[0];
                                let endTime = await times[1];

                                // Aksi mengisi waktu untuk jadwal time start nya
                                let action1 = await driver.actions({async: true});
                                await action1.move({origin: await startTime}).press().perform();
                                await driver.sleep(2000);
                                let randomHourStart = await driver.executeScript(`return document.querySelectorAll('.select-list')[0].querySelectorAll("ul.hours li")[${faker.number.int({ min: 1, max: 3 })}]`);
                                await driver.sleep(1000);
                                await driver.executeScript('arguments[0].scrollIntoView()', await randomHourStart);
                                await driver.sleep(2000);
                                await driver.executeScript('arguments[0].click()', await randomHourStart);
                                await driver.sleep(1000);
                                let randomMinuteStart = await driver.executeScript(`return document.querySelectorAll('.select-list')[0].querySelectorAll("ul.minutes li")[1]`);
                                await driver.executeScript('arguments[0].click()', await randomMinuteStart);
                                await driver.sleep(1000);
                                scheduleTimeStart = await randomHourStart.getAttribute('innerText') + ':' + await randomMinuteStart.getAttribute('innerText');
                                await driver.executeScript(`return document.querySelector('.dropdown.drop-down').style.display = 'none';`);
                                await driver.sleep(5000);

                                // Aksi mengisi waktu untuk jadwal time end nya
                                let action2 = await driver.actions({async: true});
                                await action2.move({origin: await endTime}).press().perform();
                                await driver.sleep(2000);
                                await driver.executeScript(`return document.querySelectorAll('.dropdown.drop-down')[1].style.display = 'block';`);
                                let randomHourEnd = await driver.executeScript(`return document.querySelectorAll('.select-list')[1].querySelectorAll("ul.hours li")[${faker.number.int({ min: await randomHourStart.getAttribute('innerText').then(value => Number(value)) + 1, max: await randomHourStart.getAttribute('innerText').then(value => Number(value)) + 3 })}]`);
                                await driver.sleep(1000);
                                await driver.executeScript('arguments[0].scrollIntoView()', await randomHourEnd);
                                await driver.sleep(2000);
                                await driver.executeScript('arguments[0].click()', await randomHourEnd);
                                await driver.sleep(1000);
                                let randomMinuteEnd = await driver.executeScript(`return document.querySelectorAll('.select-list')[1].querySelectorAll("ul.minutes li")[1]`);
                                await driver.executeScript('arguments[0].click()', await randomMinuteEnd);
                                await driver.sleep(1000);
                                scheduleTimeEnd = await randomHourEnd.getAttribute('innerText') + ':' + await randomMinuteEnd.getAttribute('innerText');
                                scheduleTime = scheduleTimeStart + '-' + scheduleTimeEnd;
                                await driver.executeScript(`return document.querySelectorAll('.dropdown.drop-down')[1].style.display = 'none';`);
                                await driver.sleep(3000);
                                await driver.executeScript(`return document.querySelector(".button-container button.default").click()`);
                                

                            } else {

                                // Aksi Sleep
                                await driver.sleep(2000);
                                
                                // Aksi memilih jadwal yang di inginkan
                                let previousTimeStart = await driver.executeScript(`return parseInt(document.querySelector('.modal-body .wrapper div:not([class]):not([id])').querySelectorAll(".no-pd input.display-time")[0].value)`);
                                let previousTimeEnd = await driver.executeScript(`return parseInt(document.querySelector('.modal-body .wrapper div:not([class]):not([id])').querySelectorAll(".no-pd input.display-time")[1].value)`);
                                let times = await driver.findElements(By.css(".modal-body .no-pd input.display-time"));
                                let startTime = await times[0];
                                let endTime = await times[1];

                                // Aksi mengisi waktu untuk jadwal time start nya
                                let action1 = await driver.actions({async: true});
                                await action1.move({origin: await startTime}).press().perform();
                                await driver.sleep(2000);
                                let randomHourStart = await driver.executeScript(`return document.querySelectorAll('.select-list')[2].querySelectorAll("ul.hours li")[${faker.number.int({ min: previousTimeEnd + 1, max: previousTimeEnd + 2 })}]`);
                                await driver.sleep(1000);
                                await driver.executeScript('arguments[0].scrollIntoView()', await randomHourStart);
                                await driver.sleep(2000);
                                await driver.executeScript('arguments[0].click()', await randomHourStart);
                                await driver.sleep(1000);
                                let randomMinuteStart = await driver.executeScript(`return document.querySelectorAll('.select-list')[2].querySelectorAll("ul.minutes li")[1]`);
                                await driver.executeScript('arguments[0].click()', await randomMinuteStart);
                                await driver.sleep(1000);
                                scheduleTimeStart = await randomHourStart.getAttribute('innerText') + ':' + await randomMinuteStart.getAttribute('innerText');
                                await driver.executeScript(`return document.querySelectorAll('.dropdown.drop-down')[2].style.display = 'none';`);
                                await driver.sleep(5000);

                                // Aksi mengisi waktu untuk jadwal time end nya
                                let action2 = await driver.actions({async: true});
                                await action2.move({origin: await endTime}).press().perform();
                                await driver.sleep(2000);
                                await driver.executeScript(`return document.querySelectorAll('.dropdown.drop-down')[3].style.display = 'block';`);
                                let randomHourEnd = await driver.executeScript(`return document.querySelectorAll('.select-list')[3].querySelectorAll("ul.hours li")[${faker.number.int({ min: await randomHourStart.getAttribute('innerText').then(value => Number(value)) + 1, max: 23 })}]`);
                                await driver.sleep(1000);
                                await driver.executeScript('arguments[0].scrollIntoView()', await randomHourEnd);
                                await driver.sleep(2000);
                                await driver.executeScript('arguments[0].click()', await randomHourEnd);
                                await driver.sleep(1000);
                                let randomMinuteEnd = await driver.executeScript(`return document.querySelectorAll('.select-list')[3].querySelectorAll("ul.minutes li")[1]`);
                                await driver.executeScript('arguments[0].click()', await randomMinuteEnd);
                                await driver.sleep(1000);
                                scheduleTimeEnd = await randomHourEnd.getAttribute('innerText') + ':' + await randomMinuteEnd.getAttribute('innerText');
                                scheduleTime = scheduleTimeStart + '-' + scheduleTimeEnd;
                                await driver.executeScript(`return document.querySelectorAll('.dropdown.drop-down')[3].style.display = 'none';`);
                                await driver.sleep(3000);
                                await driver.executeScript(`return document.querySelector(".button-container button.default").click()`);
                                
                            }

                            // Aksi Sleep
                            await driver.sleep(2000);

                            // Expect results and add custom message for addtional description
                            newScheduleTime = await scheduleCards[indexScheduleCard].findElement(By.css('p.time'));
                            let textNewScheduleTime = await newScheduleTime.getAttribute('innerText');
                            customMessages = [
                                await textNewScheduleTime.includes(scheduleTime) ? 'Successfully save the time schedule data ✅' : 'Failed save the time schedule data ❌'
                            ];
                            expect(await textNewScheduleTime.includes(scheduleTime)).to.eq(true);


                        } catch (error) {
                            expect.fail(error);
                        }


                    });
                    
                    it(`Reader - Add time schedule of consultation from browser ${browser}`, async function() {

                        try {
                            // Aksi masuk ke dalam halaman browser
                            driver = await goToApp(browser, appHost);
                            await driver.manage().window().maximize();

                            // Aksi menunggu mengisi form login untuk melakukan authentication
                            await loginToApp(driver, user, browser, appHost);
                            
                            // Aksi Sleep
                            await driver.sleep(3000);

                            // Aksi mengklik tab menu profile reader
                            await driver.executeScript(`return document.querySelectorAll("ul.navbar-nav li.nav-item a.nav-link a")[document.querySelectorAll("ul.navbar-nav li.nav-item").length - 1].click();`);
                            
                            // Aksi Sleep
                            await driver.sleep(2000);

                            // Aksi mengklik tab Atur Jadwal
                            await driver.executeScript(`return document.querySelectorAll('img.icon-sm')[2].click();`);

                            // Aksi Sleep
                            await driver.sleep(2000);

                            // Aksi seleksi jadwal
                            let scheduleCards = await driver.executeScript(`return document.querySelectorAll('.schedule-card')`);
                            let indexScheduleCard = faker.number.int({ min: 0, max: await scheduleCards.length - 1 });
                            let scheduleTime, scheduleTimeStart, scheduleTimeEnd, newScheduleTime;
                            let earlyTime;

                            scheduleTime = await scheduleCards[indexScheduleCard].findElement(By.css('p.time'));
                                
                            // Aksi klik button edit schedule
                            await scheduleCards[indexScheduleCard].findElement(By.css('div.add')).click();
                            
                            if(await scheduleTime.getAttribute('innerText') === 'OFF') {


                                // Aksi Sleep
                                await driver.sleep(2000);

                                // Aksi klik button circle untuk activate schedule
                                await driver.executeScript(`return document.querySelectorAll('.circle-input')[1].click();`);
                                
                                // Aksi Sleep
                                await driver.sleep(2000);
                                
                                // Aksi klik button edit schedule
                                await driver.executeScript(`return document.querySelector(".modal-body .add").click()`);
                                
                                // Aksi Sleep
                                await driver.sleep(2000);

                                // Aksi memilih jadwal yang di inginkan
                                let times = await driver.findElements(By.css(".modal-body .no-pd input.display-time"));
                                let startTime = await times[0];
                                let endTime = await times[1];

                                // Aksi mengisi waktu untuk jadwal time start nya
                                let action1 = await driver.actions({async: true});
                                await action1.move({origin: await startTime}).press().perform();
                                await driver.sleep(2000);
                                let randomHourStart = await driver.executeScript(`return document.querySelectorAll('.select-list')[0].querySelectorAll("ul.hours li")[${faker.number.int({ min: 2, max: 4 })}]`);
                                await driver.sleep(1000);
                                await driver.executeScript('arguments[0].scrollIntoView()', await randomHourStart);
                                await driver.sleep(2000);
                                await driver.executeScript('arguments[0].click()', await randomHourStart);
                                await driver.sleep(1000);
                                let randomMinuteStart = await driver.executeScript(`return document.querySelectorAll('.select-list')[0].querySelectorAll("ul.minutes li")[1]`);
                                await driver.executeScript('arguments[0].click()', await randomMinuteStart);
                                await driver.sleep(1000);
                                scheduleTimeStart = await randomHourStart.getAttribute('innerText') + ':' + await randomMinuteStart.getAttribute('innerText');
                                await driver.executeScript(`return document.querySelector('.dropdown.drop-down').style.display = 'none';`);
                                await driver.sleep(5000);

                                // Aksi mengisi waktu untuk jadwal time end nya
                                let action2 = await driver.actions({async: true});
                                await action2.move({origin: await endTime}).press().perform();
                                await driver.sleep(2000);
                                await driver.executeScript(`return document.querySelectorAll('.dropdown.drop-down')[1].style.display = 'block';`);
                                let randomHourEnd = await driver.executeScript(`return document.querySelectorAll('.select-list')[1].querySelectorAll("ul.hours li")[${faker.number.int({ min: parseInt(await randomHourStart.getAttribute('innerText')) + 2, max: parseInt(await randomHourStart.getAttribute('innerText')) + 3 })}]`);
                                await driver.sleep(1000);
                                await driver.executeScript('arguments[0].scrollIntoView()', await randomHourEnd);
                                await driver.sleep(2000);
                                await driver.executeScript('arguments[0].click()', await randomHourEnd);
                                await driver.sleep(1000);
                                let randomMinuteEnd = await driver.executeScript(`return document.querySelectorAll('.select-list')[1].querySelectorAll("ul.minutes li")[1]`);
                                await driver.executeScript('arguments[0].click()', await randomMinuteEnd);
                                await driver.sleep(1000);
                                scheduleTimeEnd = await randomHourEnd.getAttribute('innerText') + ':' + await randomMinuteEnd.getAttribute('innerText');
                                scheduleTime = scheduleTimeStart + '-' + scheduleTimeEnd;
                                await driver.executeScript(`return document.querySelectorAll('.dropdown.drop-down')[1].style.display = 'none';`);
                                await driver.sleep(3000);
                                await driver.executeScript(`return document.querySelector(".button-container button.default").click()`);
                                

                            } else {

                                // Aksi Sleep
                                await driver.sleep(2000);
                                
                                // Aksi klik button edit schedule
                                await driver.executeScript(`return document.querySelector(".modal-body .add").click()`);
                                
                                // Aksi memilih jadwal yang di inginkan
                                let previousTimeStart = await driver.executeScript(`return parseInt(document.querySelectorAll('.modal-body .wrapper div:not([class]):not([id])')[document.querySelectorAll('.modal-body .wrapper div:not([class]):not([id])').length - 2].querySelectorAll(".no-pd input.display-time")[0].value)`);
                                let previousTimeEnd = await driver.executeScript(`return parseInt(document.querySelectorAll('.modal-body .wrapper div:not([class]):not([id])')[document.querySelectorAll('.modal-body .wrapper div:not([class]):not([id])').length - 2].querySelectorAll(".no-pd input.display-time")[1].value)`);
                                let times = await driver.executeScript(`return document.querySelectorAll('.modal-body .wrapper div:not([class]):not([id])')[document.querySelectorAll('.modal-body .wrapper div:not([class]):not([id])').length - 1].querySelectorAll(".no-pd input.display-time");`);
                                let startTime = await times[0];
                                let endTime = await times[1];

                                // Aksi Sleep
                                await driver.sleep(2000);

                                // Aksi mengisi waktu untuk jadwal time start nya
                                let action1 = await driver.actions({async: true});
                                await action1.move({origin: await startTime}).press().perform();
                                await driver.sleep(2000);
                                let randomHourStart = await driver.executeScript(`return document.querySelectorAll(".select-list")[document.querySelectorAll(".select-list").length - 2].querySelectorAll("ul.hours li")[${faker.number.int({ min: previousTimeEnd + 2, max: previousTimeEnd + 3 })}]`);
                                await driver.sleep(1000);
                                await driver.executeScript('arguments[0].scrollIntoView()', await randomHourStart);
                                await driver.sleep(2000);
                                await driver.executeScript('arguments[0].click()', await randomHourStart);
                                await driver.sleep(1000);
                                let randomMinuteStart = await driver.executeScript(`return document.querySelectorAll('.select-list')[0].querySelectorAll("ul.minutes li")[1]`);
                                await driver.executeScript('arguments[0].click()', await randomMinuteStart);
                                await driver.sleep(1000);
                                scheduleTimeStart = await randomHourStart.getAttribute('innerText') + ':' + await randomMinuteStart.getAttribute('innerText');
                                await driver.executeScript(`return document.querySelectorAll(".dropdown.drop-down")[document.querySelectorAll(".select-list").length - 2].style.display = 'none';`);
                                await driver.sleep(5000);

                                // Aksi mengisi waktu untuk jadwal time end nya
                                let action2 = await driver.actions({async: true});
                                await action2.move({origin: await endTime}).press().perform();
                                await driver.sleep(2000);
                                await driver.executeScript(`return document.querySelectorAll(".dropdown.drop-down")[document.querySelectorAll(".select-list").length - 1].style.display = 'block';`);
                                let randomHourEnd = await driver.executeScript(`return document.querySelectorAll(".select-list")[document.querySelectorAll(".select-list").length - 1].querySelectorAll("ul.hours li")[${faker.number.int({ min: await randomHourStart.getAttribute('innerText').then(value => Number(value)) + 2, max: await randomHourStart.getAttribute('innerText').then(value => Number(value)) + 3 })}]`);
                                await driver.sleep(1000);
                                await driver.executeScript('arguments[0].scrollIntoView()', await randomHourEnd);
                                await driver.sleep(2000);
                                await driver.executeScript('arguments[0].click()', await randomHourEnd);
                                await driver.sleep(1000);
                                let randomMinuteEnd = await driver.executeScript(`return document.querySelectorAll('.select-list')[1].querySelectorAll("ul.minutes li")[1]`);
                                await driver.executeScript('arguments[0].click()', await randomMinuteEnd);
                                await driver.sleep(1000);
                                scheduleTimeEnd = await randomHourEnd.getAttribute('innerText') + ':' + await randomMinuteEnd.getAttribute('innerText');
                                scheduleTime = scheduleTimeStart + '-' + scheduleTimeEnd;
                                await driver.executeScript(`return document.querySelectorAll(".dropdown.drop-down")[document.querySelectorAll(".select-list").length - 1].style.display = 'none';`);
                                await driver.sleep(3000);
                                await driver.executeScript(`return document.querySelector(".button-container button.default").click()`);
                                
                            }

                            // Aksi Sleep
                            await driver.sleep(2000);
                            
                            
                            // Expect results and add custom message for addtional description
                            newScheduleTime = await scheduleCards[indexScheduleCard].findElements(By.css('p.time'));
                            let textNewScheduleTime = await newScheduleTime.reduce(async (accumulatorPromise, timeElement) => {
                                const accumulator = await accumulatorPromise;
                                const timeText = await timeElement.getText();
                                return `${accumulator} ${timeText}`;
                            }, '');
                            customMessages = [
                                await textNewScheduleTime.includes(scheduleTime) ? 'Successfully add and save the time schedule data ✅' : 'Failed to add and save the time schedule data ❌'
                            ];
                            expect(await textNewScheduleTime.includes(scheduleTime)).to.eq(true);


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

                            // Aksi klik button Atur Jadwal
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

                    break;
            }
        });

    })



});