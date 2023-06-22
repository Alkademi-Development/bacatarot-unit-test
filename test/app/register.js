import { describe, afterEach, before } from 'mocha';
import { Builder, By, Key, until, logging, Capabilities } from 'selenium-webdriver';
import addContext from 'mochawesome/addContext.js';
import assert from 'assert';
import { expect } from "chai";
import yargs from 'yargs';
import fs from 'fs';
import path from 'path';
import { BROWSERS } from '#root/commons/constants/browser';
import { goToApp } from '#root/commons/utils/appUtils';
import { appHost } from '#root/api/app-token';
import { takeScreenshot } from '#root/commons/utils/fileUtils';
import { fileURLToPath } from 'url';
import { captureConsoleErrors } from '#root/commons/utils/generalUtils';
import { thrownAnError } from '#root/commons/utils/generalUtils';
import moment from 'moment-timezone';
import { faker } from '@faker-js/faker';

let driver;
let errorMessages;
let screenshootFilePath = fileURLToPath(import.meta.url);
if (process.platform === 'win32') {
    screenshootFilePath = path.resolve(`./testResults/screenshoots/${screenshootFilePath.replaceAll("\\", "\\").split("\\test\\")[1].replaceAll(".js", "")}/`);
} else {
    screenshootFilePath = path.resolve(`./testResults/screenshoots/${screenshootFilePath.split("/test/")[1].replaceAll(".js", "")}/`);
}

describe("Register", () => {
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
                value: customMessages?.length > 0 ? "- " + customMessages.map(msg => msg.trim()).join("\n- ") : 'No Results'
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
        try {
            await driver.quit();
        } catch (error) {
            console.error('Error occurred while quitting the driver:', error);
        }
    })

    BROWSERS.forEach(browser => {

        it(`Register - from browser ${browser}`, async () => {

            try {

                
                driver = await goToApp(browser, appHost);
                await driver.manage().window().maximize();

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

                // Aksi menghilangkan modal dengan click close 
                await driver.wait(until.elementLocated(By.css('.modal-content')));
                await driver.executeScript(`return document.querySelector('.modal-content button.close').click();`);

                // Aksi klik button login 
                await driver.executeScript(`return document.querySelector('ul li a > button.btn-login').click();`);

                // Aksi sleep
                await driver.sleep(5000);

                // Aksi klik button register
                await driver.executeScript(`return document.querySelector('.register-button').click();`);
                
                // Aksi sleep
                await driver.sleep(5000);

                // Aksi mengisi form registration
                // Dummy data registration
                let fullName = `Adnan Erlansyah`;
                let emailData = `${fullName.toLowerCase().replace(/ /g, '')}02@gmail.com`;
                let passwordData = 'semuasama';

                // Fill data registration
                await driver.wait(until.elementLocated(By.css(`input[type="email"]`)));
                await driver.findElement(By.css(`input[type="email"]`)).sendKeys(emailData);
                await driver.findElement(By.css(`input[type="password"]`)).sendKeys(passwordData);
                await driver.findElement(By.css(`input#reTypePassword`)).sendKeys(passwordData);

                const stepOneAllFilled = await Promise.all([
                    await driver.findElement(By.css(`input[type="email"]`)).getAttribute('value'),
                    await driver.findElement(By.css(`input[type="password"]`)).getAttribute('value'),
                    await driver.findElement(By.css(`input#reTypePassword`)).getAttribute('value'),
                ]).then(results => results.every(value => value != ''));
                if(stepOneAllFilled) {
                    await driver.executeScript(`return document.querySelector('.wrapper button.btn-lanjut').classList.remove('disabled');`);
                    await driver.executeScript(`return document.querySelector('.wrapper button.btn-lanjut').removeAttribute('disabled')`);
                    // Aksi Sleep
                    await driver.sleep(5000);
                    await driver.executeScript(`return document.querySelector('.wrapper button.btn-lanjut').click()`);
                }
                // Aksi Sleep
                await driver.sleep(5000);
                // Fill again
                await driver.findElement(By.css("input#name")).sendKeys(fullName);
                // Input DatePicker Start
                await driver.executeScript(`return document.querySelector("input.datepicker").click()`);

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
                let radioGenders = await driver.executeScript(`return document.querySelectorAll('.radio-gender .radio-item')`);
                await radioGenders[faker.number.int({ min: 0, max: 1 })].click();
                await driver.executeScript(`return document.querySelector('input#ketentuan').click()`);
                const isAllFilled = await Promise.all([
                    await driver.findElement(By.css("input#name")).getAttribute('value'),
                    await driver.findElement(By.css("input.datepicker")).getAttribute('value'),
                    await driver.findElement(By.css(`input[name="radio-gender"]`)).getAttribute('value'),
                    await driver.findElement(By.css("input#ketentuan")).getAttribute('value'),
                ]).then(results => results.every(value => value != ''));
                if(isAllFilled) {
                    await driver.executeScript(`return document.querySelector('button.btn-lanjut').classList.remove('disabled');`);
                    await driver.executeScript(`return document.querySelector('button.btn-lanjut').removeAttribute('disabled')`);
                    // Aksi Sleep
                    await driver.sleep(5000);
                    await driver.executeScript(`return document.querySelector('button.btn-lanjut').click();`);
                }
                // Aksi menunggu element overlay loading hilang
                await driver.wait(until.elementLocated(By.css('.overlay-loading .loading')));
                let overlayLoading = await driver.findElement(By.css('.overlay-loading .loading'));
                await driver.wait(until.stalenessOf(overlayLoading));
                let errorElement = await driver.executeScript(`return document.querySelectorAll('p.error');`)
                if (errorElement.length > 0) await thrownAnError(await driver.executeScript(`return document.querySelector('p.error').innerText;`), errorElement.length > 0);
                let defaultButton = await driver.executeScript(`return document.querySelectorAll('.content .default-button')`);
                if(defaultButton?.length > 0) await driver.executeScript(`return document.querySelector('.content .default-button').click();`);


                // Check the result
                let userData = await driver.executeScript("return window.localStorage.getItem('user_data')");
                userData = await JSON.parse(userData);
                customMessages = [
                    isAllFilled & stepOneAllFilled ? 'All data registration already filled ✅' : 'All data registration already filled ❌',
                    userData?.id > 0 ? "Successfully get the data from local storage ✅" : "No data available from local storage ❌",
                ];
                expect(isAllFilled).to.eq(true);
                expect(parseInt(userData.id)).to.greaterThan(0);
            } catch (error) {
                expect.fail(error);
            }


        });

    })



});