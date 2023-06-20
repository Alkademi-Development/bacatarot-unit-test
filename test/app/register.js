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

describe("Test", () => {
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
        addContext(this, {
            title: 'Screenshoot-Test-Results',
            value: "..\\" + path.relative(fileURLToPath(import.meta.url), fileNamePath)
        });
        await driver.sleep(3000);
        await driver.quit();
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
                let fullName = `${faker.name.firstName()} ${faker.name.lastName()}`;
                let emailData = `${fullName.toLowerCase().replace(/ /g, '.')}@gmail.com`;
                let passwordData = 'semuasama';
                let dataDate = `${faker.number.int({ min: 1, max: 29 })} ${faker.date.month()} ${faker.number.int({ min: 1995, max: 2005 })}`;

                // Fill data registration
                await driver.wait(until.elementLocated(By.css(`input[type="email"]`)));
                await driver.findElement(By.css(`input[type="email"]`)).sendKeys(emailData);
                await driver.findElement(By.css(`input[type="password"]`)).sendKeys(passwordData);
                await driver.findElement(By.css(`input#reTypePassword`)).sendKeys(passwordData);

                const isAllFilled = await Promise.all([
                    await driver.findElement(By.css(`input[type="email"]`)).getAttribute('value'),
                    await driver.findElement(By.css(`input[type="password"]`)).getAttribute('value'),
                    await driver.findElement(By.css(`input#reTypePassword`)).getAttribute('value'),
                ]).then(results => results.every(value => value != ''));
                if(isAllFilled) await driver.executeScript(`return document.querySelector('.wrapper button.btn-lanjut').click()`);
                // Aksi Sleep
                await driver.sleep(5000);
                // Fill again
                let datePickerInput = await driver.findElement(By.css("input.datepicker"));
                await driver.executeScript("arguments[0].removeAttribute('readonly')", datePickerInput);
                await datePickerInput.sendKeys(dataDate);
                await driver.executeScript(async function() {
                    let radioGenders = document.querySelectorAll('.radio-gender .radio-item');
                    return radioGenders[faker.number.int({ min: 0, max: 1 })].click();
                });
                await driver.executeScript(`return document.querySelector('input#ketentuan').click()`);
                

                // Check the result
                customMessages = [
                    isAllFilled ? 'All data registration already filled ✅' : 'All data registration already filled ❌'
                ];
                expect(isAllFilled).to.eq(true);
            } catch (error) {
                expect.fail(error);
            }


        });

    })



});