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

describe("Login", () => {
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
                    it(`User - Check more details about payment after booked the reader from browser ${browser}`, async () => {

                        try {
                            driver = await goToApp(browser, appHost);
                            await driver.manage().window().maximize();

                            // Aksi menunggu mengisi form login untuk melakukan authentication
                            await loginToApp(driver, user, browser, appHost);

                            // Aksi sleep
                            await driver.sleep(3000);
                            // Aksi menunggu response halaman ter-load semua
                            await driver.wait(async function () {
                                const isNetworkIdle = await driver.executeScript(function () {
                                  const performanceEntries = window.performance.getEntriesByType('resource');
                                  return performanceEntries.every(function (entry) {
                                    return entry.responseEnd > 0;
                                  });
                                });
                              
                                return isNetworkIdle;
                            }); 

                            // Aksi klik menu tab notification
                            await driver.executeScript(`return document.querySelectorAll("ul.navbar-nav li.nav-item a a")[2].click()`);

                            // Aksi sleep
                            await driver.sleep(3000);

                            // Aksi klik payment tab for see the list of payments
                            await driver.executeScript(`return document.querySelectorAll('.notification-tab .notification-wrapper .tab-title')[1].click();`);
                            // Aksi sleep
                            await driver.sleep(3000);

                            // Aksi Check list payment
                            let payments = await driver.executeScript(`return document.querySelectorAll('#notification-card');`);
                            await thrownAnError('Payment is empty', await payments.length === 0);

                            // Aksi sleep
                            await driver.sleep(3000);

                            // Aksi klik button 'Lihat Rincian' untuk lihat detail dari pembayaran
                            let buttonDetailPayment = await driver.executeScript(`return document.querySelectorAll('button.btn-detail')`);
                            await driver.executeScript(`return document.querySelectorAll('button.btn-detail')[${faker.number.int({ min: 0, max: await buttonDetailPayment.length - 1 })}].click()`);

                            // Aksi sleep
                            await driver.sleep(3000);

                            // Aksi cek modal booking muncul
                            let bookingModal = await driver.findElement(By.css('.booking-modal'));
                            await thrownAnError('Booking modal details is not displayed or show up', await bookingModal.isDisplayed() === false);

                            // Expect results and add custom message for addtional description
                            let textConfirmationOrder = await driver.findElement(By.css('h1.page-title'));
                            customMessages = [
                                await bookingModal.isDisplayed() && await textConfirmationOrder.isDisplayed() ? 'Booking modal details is displayed or show up ✅' : 'Booking modal details is not displayed or show up ❌'
                            ];
                            expect(await bookingModal.isDisplayed() && await textConfirmationOrder.isDisplayed()).to.equal(true);

                        } catch (error) {
                            expect.fail(error);
                        }


                    });

                    break;

                case 2:
                    it(`Reader - from browser ${browser}`, async () => {

                        try {

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