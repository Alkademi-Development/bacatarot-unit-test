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
                    it(`User - Booking Reader as a user without using voucher by use payment method 'Bank Transfer' from browser ${browser}`, async () => {

                        try {
                            driver = await goToApp(browser, appHost);
                            await driver.manage().window().maximize();

                            // Aksi menunggu mengisi form login untuk melakukan authentication
                            await loginToApp(driver, user, browser, appHost);

                            // Aksi sleep
                            await driver.sleep(10000);

                            // Aksi mem-booking salah satu reader
                            let readerList = await driver.executeScript(`return document.querySelectorAll("#user-list")`);
                            await thrownAnError('Reader is empty', await readerList.length === 0);
                            let randomIndexReader = faker.number.int({ min: 0, max: await readerList.length - 1 });
                            await driver.sleep(1000);
                            await driver.executeScript(`return document.querySelectorAll('#user-list')[${randomIndexReader}].querySelector('.action-btn').click()`);

                            // Aksi sleep
                            await driver.sleep(3000);
                            
                            // Aksi memilih salah satu paket booking
                            let packageList = await driver.executeScript(`return document.querySelectorAll("#user-list")`);
                            await thrownAnError('Package is empty', await packageList.length === 0);
                            let randomIndexPackage = faker.number.int({ min: 0, max: await packageList.length - 1 });
                            await driver.executeScript(`return document.querySelectorAll(".modal-body .duration-card")[${randomIndexPackage}].click()`);
                            await driver.sleep(2000);
                            await driver.executeScript(`return document.querySelector(".modal-body .submit-btn button").click()`);
                            
                            // Aksi sleep
                            await driver.sleep(3000);

                            // Aksi memilih salah satu jadwal konsultasi pada booking
                            let activeDays = await driver.executeScript(`return document.querySelectorAll('.modal-body span.day:not(.disabled,.blank,.sun,.sat)')`)
                            // await thrownAnError('There are no active days', await activeDays.length === 0);
                            let randomIndexDay = faker.number.int({ min: 0, max: await activeDays.length - 1 });
                            await driver.executeScript(`return document.querySelectorAll('.modal-body span.day:not(.disabled,.blank,.sun,.sat)')[${randomIndexDay}].click()`);
                            await driver.sleep(2000);
                            await driver.executeScript(`return document.querySelectorAll('.modal-body .time-picker-header .time-option')[0].click()`);
                            await driver.sleep(2000);
                            
                            // Aksi memilih salah satu hour time pada booking
                            let hourTime = await driver.executeScript(`return document.querySelectorAll(".modal-body .time-picker .hour-card:not(.disable)")`);
                            let indexTimePickerHeader = 1;
                            async function searchHourTime() {
                                if(await hourTime.length === 0) {
                                    await thrownAnError('All hours time is empty or disable', indexTimePickerHeader > await driver.executeScript(`return document.querySelectorAll('.modal-body .time-picker-header .time-option').length`));
                                    await driver.executeScript(`return document.querySelectorAll('.modal-body .time-picker-header .time-option')[${indexTimePickerHeader}].click()`);
                                    await driver.sleep(2000);
                                    hourTime = await driver.executeScript(`return document.querySelectorAll(".modal-body .time-picker .hour-card:not(.disable)")`);
                                    indexTimePickerHeader++;
                                    await searchHourTime();
                                } else {
                                    await driver.sleep(2000);
                                    await driver.executeScript(`return document.querySelectorAll('.modal-body .time-picker .hour-card:not(.disable)')[0].click()`);
                                }
                            }
                            await searchHourTime();

                            // Aksi sleep
                            await driver.sleep(3000);

                            // Aksi klik button next
                            await driver.executeScript(`return document.querySelector('.modal-body .submit-btn button').click()`);
                            
                            // Aksi sleep
                            await driver.sleep(3000);

                            // Aksi klik button 'Pilih Pembayaran'
                            await driver.executeScript(`return document.querySelector(".action-container button.custom-button").click()`);
                            
                            // Aksi sleep
                            await driver.sleep(8000);
                            
                            // Aksi pindah ke halaman payment midtrans
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

                            // Aksi menunggu card payment methods
                            await driver.sleep(5000);

                            // Aksi memilih metode pembayaran virtual account
                            await driver.executeScript(`return document.querySelectorAll(".list-payment-logo")[1].click()`);
                            
                            // Aksi sleep
                            await driver.sleep(3000);

                            // Aksi memilih salah satu bank yang ingin di pakai
                            let bankList = await driver.executeScript(`return document.querySelectorAll('.bank-list-layout a.bank-list')`);
                            let randomIndexBank = faker.number.int({ min: 0, max: bankList.length - 2 });
                            await driver.executeScript(`return document.querySelectorAll(".bank-list-layout a.bank-list")[${randomIndexBank}].click()`);
                            await driver.sleep(5000);

                            // Expect results and add custom message for addtional description
                            let vaField = await driver.executeScript(`return document.querySelector('.payment-page-layout .payment-number').innerText`);
                            customMessages = [
                                vaField != '' ? 'Successfully get the virtual account number for pay the booking ✅' : 'Failed to get the virtual account number for pay the booking ❌'
                            ];
                            expect(vaField).to.not.be.empty;

                        } catch (error) {
                            expect.fail(error);
                        }


                    });
                    
                    it(`User - Booking Reader as a user without using voucher by use payment method 'Gopay' or etc from browser ${browser}`, async () => {

                        try {
                            driver = await goToApp(browser, appHost);
                            await driver.manage().window().maximize();

                            // Aksi menunggu mengisi form login untuk melakukan authentication
                            await loginToApp(driver, user, browser, appHost);

                            // Aksi sleep
                            await driver.sleep(10000);

                            // Aksi mem-booking salah satu reader
                            let readerList = await driver.executeScript(`return document.querySelectorAll("#user-list")`);
                            await thrownAnError('Reader is empty', await readerList.length === 0);
                            let randomIndexReader = faker.number.int({ min: 0, max: await readerList.length - 1 });
                            await driver.sleep(1000);
                            await driver.executeScript(`return document.querySelectorAll('#user-list')[${randomIndexReader}].querySelector('.action-btn').click()`);

                            // Aksi sleep
                            await driver.sleep(3000);
                            
                            // Aksi memilih salah satu paket booking
                            let packageList = await driver.executeScript(`return document.querySelectorAll("#user-list")`);
                            await thrownAnError('Package is empty', await packageList.length === 0);
                            let randomIndexPackage = faker.number.int({ min: 0, max: await packageList.length - 1 });
                            await driver.executeScript(`return document.querySelectorAll(".modal-body .duration-card")[${randomIndexPackage}].click()`);
                            await driver.sleep(2000);
                            await driver.executeScript(`return document.querySelector(".modal-body .submit-btn button").click()`);
                            
                            // Aksi sleep
                            await driver.sleep(3000);

                            // Aksi memilih salah satu jadwal konsultasi pada booking
                            let activeDays = await driver.executeScript(`return document.querySelectorAll('.modal-body span.day:not(.disabled,.blank,.sun,.sat)')`)
                            // await thrownAnError('There are no active days', await activeDays.length === 0);
                            let randomIndexDay = faker.number.int({ min: 0, max: await activeDays.length - 1 });
                            await driver.executeScript(`return document.querySelectorAll('.modal-body span.day:not(.disabled,.blank,.sun,.sat)')[${randomIndexDay}].click()`);
                            await driver.sleep(2000);
                            await driver.executeScript(`return document.querySelectorAll('.modal-body .time-picker-header .time-option')[0].click()`);
                            await driver.sleep(2000);
                            
                            // Aksi memilih salah satu hour time pada booking
                            let hourTime = await driver.executeScript(`return document.querySelectorAll(".modal-body .time-picker .hour-card:not(.disable)")`);
                            let indexTimePickerHeader = 1;
                            async function searchHourTime() {
                                if(await hourTime.length === 0) {
                                    await thrownAnError('All hours time is empty or disable', indexTimePickerHeader > await driver.executeScript(`return document.querySelectorAll('.modal-body .time-picker-header .time-option').length`));
                                    await driver.executeScript(`return document.querySelectorAll('.modal-body .time-picker-header .time-option')[${indexTimePickerHeader}].click()`);
                                    await driver.sleep(2000);
                                    hourTime = await driver.executeScript(`return document.querySelectorAll(".modal-body .time-picker .hour-card:not(.disable)")`);
                                    indexTimePickerHeader++;
                                    await searchHourTime();
                                } else {
                                    await driver.sleep(2000);
                                    await driver.executeScript(`return document.querySelectorAll('.modal-body .time-picker .hour-card:not(.disable)')[0].click()`);
                                }
                            }
                            await searchHourTime();

                            // Aksi sleep
                            await driver.sleep(3000);

                            // Aksi klik button next
                            await driver.executeScript(`return document.querySelector('.modal-body .submit-btn button').click()`);
                            
                            // Aksi sleep
                            await driver.sleep(3000);

                            // Aksi klik button 'Pilih Pembayaran'
                            await driver.executeScript(`return document.querySelector(".action-container button.custom-button").click()`);
                            
                            // Aksi sleep
                            await driver.sleep(8000);
                            
                            // Aksi pindah ke halaman payment midtrans
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

                            // Aksi menunggu card payment methods
                            await driver.sleep(5000);

                            // Aksi memilih metode pembayaran virtual account
                            await driver.executeScript(`return document.querySelectorAll(".list-payment-logo")[0].click()`);
                            
                            // Aksi sleep
                            await driver.sleep(5000);

                            // Expect results and add custom message for addtional description
                            let qrImage = await driver.findElement(By.css(".qr-wrapper img.qr-image"));
                            customMessages = [
                                await qrImage.isDisplayed() ? 'Successfully get the qr code or image for pay the booking ✅' : 'Failed to get the the qr code or image for pay the booking ❌'
                            ];
                            expect(await qrImage.isDisplayed()).to.equal(true);

                        } catch (error) {
                            expect.fail(error);
                        }

                    });
                    
                    it.skip(`User - Booking Reader as a user without using voucher by use payment method 'QRIS' or etc from browser ${browser}`, async () => {

                        try {
                            driver = await goToApp(browser, appHost);
                            await driver.manage().window().maximize();

                            // Aksi menunggu mengisi form login untuk melakukan authentication
                            await loginToApp(driver, user, browser, appHost);

                            // Aksi sleep
                            await driver.sleep(3000);

                            // Aksi mem-booking salah satu reader
                            let readerList = await driver.executeScript(`return document.querySelectorAll("#user-list")`);
                            await thrownAnError('Reader is empty', await readerList.length === 0);
                            let randomIndexReader = faker.number.int({ min: 0, max: await readerList.length - 1 });
                            await driver.sleep(1000);
                            await driver.executeScript(`return document.querySelectorAll('#user-list')[${randomIndexReader}].querySelector('.action-btn').click()`);

                            // Aksi sleep
                            await driver.sleep(3000);
                            
                            // Aksi memilih salah satu paket booking
                            let packageList = await driver.executeScript(`return document.querySelectorAll("#user-list")`);
                            await thrownAnError('Package is empty', await packageList.length === 0);
                            let randomIndexPackage = faker.number.int({ min: 0, max: await packageList.length - 1 });
                            await driver.executeScript(`return document.querySelectorAll(".modal-body .duration-card")[${randomIndexPackage}].click()`);
                            await driver.sleep(2000);
                            await driver.executeScript(`return document.querySelector(".modal-body .submit-btn button").click()`);
                            
                            // Aksi sleep
                            await driver.sleep(3000);

                            // Aksi memilih salah satu jadwal konsultasi pada booking
                            let activeDays = await driver.executeScript(`return document.querySelectorAll('.modal-body span.day:not(.disabled,.blank,.sun,.sat)')`)
                            // await thrownAnError('There are no active days', await activeDays.length === 0);
                            let randomIndexDay = faker.number.int({ min: 0, max: await activeDays.length - 1 });
                            await driver.executeScript(`return document.querySelectorAll('.modal-body span.day:not(.disabled,.blank,.sun,.sat)')[${randomIndexDay}].click()`);
                            await driver.sleep(2000);
                            await driver.executeScript(`return document.querySelectorAll('.modal-body .time-picker-header .time-option')[0].click()`);
                            await driver.sleep(2000);
                            
                            // Aksi memilih salah satu hour time pada booking
                            let hourTime = await driver.executeScript(`return document.querySelectorAll(".modal-body .time-picker .hour-card:not(.disable)")`);
                            let indexTimePickerHeader = 1;
                            async function searchHourTime() {
                                if(await hourTime.length === 0) {
                                    await thrownAnError('All hours time is empty or disable', indexTimePickerHeader > await driver.executeScript(`return document.querySelectorAll('.modal-body .time-picker-header .time-option').length`));
                                    await driver.executeScript(`return document.querySelectorAll('.modal-body .time-picker-header .time-option')[${indexTimePickerHeader}].click()`);
                                    await driver.sleep(2000);
                                    hourTime = await driver.executeScript(`return document.querySelectorAll(".modal-body .time-picker .hour-card:not(.disable)")`);
                                    indexTimePickerHeader++;
                                    await searchHourTime();
                                } else {
                                    await driver.sleep(2000);
                                    await driver.executeScript(`return document.querySelectorAll('.modal-body .time-picker .hour-card:not(.disable)')[0].click()`);
                                }
                            }
                            await searchHourTime();

                            // Aksi sleep
                            await driver.sleep(3000);

                            // Aksi klik button next
                            await driver.executeScript(`return document.querySelector('.modal-body .submit-btn button').click()`);
                            
                            // Aksi sleep
                            await driver.sleep(3000);

                            // Aksi klik button 'Pilih Pembayaran'
                            await driver.executeScript(`return document.querySelector(".action-container button.custom-button").click()`);
                            
                            // Aksi sleep
                            await driver.sleep(8000);
                            
                            // Aksi pindah ke halaman payment midtrans
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

                            // Aksi menunggu card payment methods
                            await driver.sleep(5000);

                            // Aksi memilih metode pembayaran virtual account
                            await driver.executeScript(`return document.querySelectorAll(".list-payment-logo")[2].click()`);
                            
                            // Aksi sleep
                            await driver.sleep(3000);

                            // Expect results and add custom message for addtional description
                            let qrImage = await driver.findElement(By.css(".qr-wrapper img.qr-image"));
                            customMessages = [
                                await qrImage.isDisplayed() ? 'Successfully get the qr code or image for pay the booking ✅' : 'Failed to get the the qr code or image for pay the booking ❌'
                            ];
                            expect(await qrImage.isDisplayed()).to.equal(true);

                        } catch (error) {
                            expect.fail(error);
                        }

                    });
                    
                    it(`User - Cancel the booking after ordered from browser ${browser}`, async () => {

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

                            // Aksi klik tab payment
                            await driver.executeScript(`return document.querySelectorAll(".notification-wrapper h1.tab-title")[1].click()`);
                             
                            // Aksi sleep
                            await driver.sleep(10000);
                            
                            // Aksi memilih salah satu request yang tersedia
                            let notificationCard = await driver.executeScript(`return document.querySelectorAll('#notification-card')`);
                            await thrownAnError('Payment of booking is empty', await notificationCard.length === 0);
                            await driver.sleep(1000);
                            await driver.executeScript(`return document.querySelectorAll("#notification-card")[0].querySelector("button.action-btn.purple").click()`);
                            
                            // Aksi sleep
                            await driver.sleep(5000);

                            // Aksi klik button batalkan pemesanan
                            await driver.executeScript(`return document.querySelector("#summary h5.warning").click()`);
                            
                            // Aksi sleep
                            await driver.sleep(3000);

                            // Aksi klik button konfirmasi pembatalan pemesanan
                            await driver.executeScript(`return document.querySelectorAll(".agreement-modal .wrapper .option p")[1].click()`);

                            // Aksi sleep
                            await driver.sleep(6000);
                            
                            // Expect results and add custom message for addtional description
                            let statusBar = await driver.findElement(By.css('#summary .status-bar'));
                            customMessages = [
                                await statusBar?.isDisplayed() ? 'Successfully cancelled the booking of reader ✅' : 'Failed to cancel the booking of reader ❌'
                            ];
                            expect(await statusBar?.isDisplayed()).to.equal(true);

                        } catch (error) {
                            expect.fail(error);
                        }

                    });
                    
                    it(`User - Use the voucher when booking a reader from browser ${browser}`, async () => {

                        try {
                            driver = await goToApp(browser, appHost);
                            await driver.manage().window().maximize();

                            // Aksi menunggu mengisi form login untuk melakukan authentication
                            await loginToApp(driver, user, browser, appHost);

                            // Aksi sleep
                            await driver.sleep(5000);

                            // Aksi mem-booking salah satu reader
                            let readerList = await driver.executeScript(`return document.querySelectorAll("#user-list")`);
                            await thrownAnError('Reader is empty', await readerList.length === 0);
                            let randomIndexReader = faker.number.int({ min: 0, max: await readerList.length - 1 });
                            await driver.sleep(1000);
                            await driver.executeScript(`return document.querySelectorAll('#user-list')[${randomIndexReader}].querySelector('.action-btn').click()`);

                            // Aksi sleep
                            await driver.sleep(3000);
                            
                            // Aksi memilih salah satu paket booking
                            let packageList = await driver.executeScript(`return document.querySelectorAll("#user-list")`);
                            await thrownAnError('Package is empty', await packageList.length === 0);
                            let randomIndexPackage = faker.number.int({ min: 0, max: await packageList.length - 1 });
                            await driver.executeScript(`return document.querySelectorAll(".modal-body .duration-card")[${randomIndexPackage}].click()`);
                            await driver.sleep(2000);
                            await driver.executeScript(`return document.querySelector(".modal-body .submit-btn button").click()`);
                            
                            // Aksi sleep
                            await driver.sleep(3000);

                            // Aksi memilih salah satu jadwal konsultasi pada booking
                            let activeDays = await driver.executeScript(`return document.querySelectorAll('.modal-body span.day:not(.disabled,.blank,.sun,.sat)')`)
                            // await thrownAnError('There are no active days', await activeDays.length === 0);
                            let randomIndexDay = faker.number.int({ min: 0, max: await activeDays.length - 1 });
                            await driver.executeScript(`return document.querySelectorAll('.modal-body span.day:not(.disabled,.blank,.sun,.sat)')[${randomIndexDay}].click()`);
                            await driver.sleep(2000);
                            await driver.executeScript(`return document.querySelectorAll('.modal-body .time-picker-header .time-option')[0].click()`);
                            await driver.sleep(2000);
                            
                            // Aksi memilih salah satu hour time pada booking
                            let hourTime = await driver.executeScript(`return document.querySelectorAll(".modal-body .time-picker .hour-card:not(.disable)")`);
                            let indexTimePickerHeader = 1;
                            async function searchHourTime() {
                                if(await hourTime.length === 0) {
                                    await thrownAnError('All hours time is empty or disable', indexTimePickerHeader > await driver.executeScript(`return document.querySelectorAll('.modal-body .time-picker-header .time-option').length`));
                                    await driver.executeScript(`return document.querySelectorAll('.modal-body .time-picker-header .time-option')[${indexTimePickerHeader}].click()`);
                                    await driver.sleep(2000);
                                    hourTime = await driver.executeScript(`return document.querySelectorAll(".modal-body .time-picker .hour-card:not(.disable)")`);
                                    indexTimePickerHeader++;
                                    await searchHourTime();
                                } else {
                                    await driver.sleep(2000);
                                    await driver.executeScript(`return document.querySelectorAll('.modal-body .time-picker .hour-card:not(.disable)')[0].click()`);
                                }
                            }
                            await searchHourTime();

                            // Aksi sleep
                            await driver.sleep(3000);

                            // Aksi klik button next
                            await driver.executeScript(`return document.querySelector('.modal-body .submit-btn button').click()`);
                            
                            // Aksi sleep
                            await driver.sleep(3000);

                            // Aksi klik button 'Pilih Voucher'
                            await driver.executeScript(`return document.querySelector("#summary .card img[alt=discount]").click()`);
                            
                            // Aksi sleep
                            await driver.sleep(3000);

                            // Aksi memilih salah satu voucher yang tersedia
                            let voucherCard = await driver.executeScript(`return document.querySelectorAll("#voucher-card")`);
                            // await thrownAnError('Voucher is empty', await voucherCard.length === 0);
                            // let randomIndexVoucher = faker.number.int({ min: 0, max: await voucherCard.length - 1 });
                            await driver.sleep(2000);
                            if(await voucherCard.length === 0) {
                                await driver.findElement(By.css('.wrapper form input[name=search]')).sendKeys('KEXOTL');
                                await driver.sleep(3000);
                            }
                            await driver.executeScript(`return document.querySelectorAll("#voucher-card")[0].querySelector('button.action-btn').click()`);
                            
                            // Aksi sleep
                            await driver.sleep(3000);

                            // Aksi mengecek potongan harga setelah menggunakan voucher
                            let priceConsultation = await driver.executeScript(`return parseInt(document.querySelectorAll(".modal-body #summary .card")[2].querySelector('div h5.text-right').innerText.replace('Rp', ''))`);
                            let priceDiscount = await driver.executeScript(`return parseInt(document.querySelectorAll(".modal-body #summary .card")[2].querySelector('div .row').nextElementSibling.querySelector('h5.text-right').innerText.replace('- Rp', ''))`);
                            let totalPrice = await driver.executeScript(`return parseInt(document.querySelector('.action-container button.custom-button div h5').innerText.replace('Rp', ''))`)
                            await driver.sleep(1000);
                            await driver.executeScript(`return document.querySelector(".action-container button.custom-button").click()`);

                            // Aksi sleep
                            await driver.sleep(3000);

                            // Expect results and add custom message for addtional description
                            // let isDiscountSummary = await driver.executeScript(`return document.querySelectorAll(".card h5 > strong")[document.querySelectorAll(".card h5 > strong").length - 1].textContent.includes('Rp0')`);
                            // let isDiscountAction = await driver.executeScript(`return document.querySelectorAll(".action-container button.custom-button h5")[document.querySelectorAll(".action-container button.custom-button h5").length - 1].textContent.includes('Rp0')`);
                            let totalDiscount = (priceConsultation / priceDiscount) * 100;
                            customMessages = [
                                priceConsultation - priceDiscount === totalPrice ? `Successfully get a discount ${totalDiscount}% ✅` : 'Failed to get a discount ❌'
                            ];
                            expect(priceConsultation - priceDiscount === totalPrice).to.equal(true);

                        } catch (error) {
                            expect.fail(error);
                        }

                    });
                    
                    it(`User - See more the details about the voucher when booking the reader from browser ${browser}`, async () => {

                        try {
                            driver = await goToApp(browser, appHost);
                            await driver.manage().window().maximize();

                            // Aksi menunggu mengisi form login untuk melakukan authentication
                            await loginToApp(driver, user, browser, appHost);

                            // Aksi sleep
                            await driver.sleep(3000);

                            // Aksi mem-booking salah satu reader
                            let readerList = await driver.executeScript(`return document.querySelectorAll("#user-list")`);
                            await thrownAnError('Reader is empty', await readerList.length === 0);
                            let randomIndexReader = faker.number.int({ min: 0, max: await readerList.length - 1 });
                            await driver.sleep(1000);
                            await driver.executeScript(`return document.querySelectorAll('#user-list')[${randomIndexReader}].querySelector('.action-btn').click()`);

                            // Aksi sleep
                            await driver.sleep(3000);
                            
                            // Aksi memilih salah satu paket booking
                            let packageList = await driver.executeScript(`return document.querySelectorAll("#user-list")`);
                            await thrownAnError('Package is empty', await packageList.length === 0);
                            let randomIndexPackage = faker.number.int({ min: 0, max: await packageList.length - 1 });
                            await driver.executeScript(`return document.querySelectorAll(".modal-body .duration-card")[${randomIndexPackage}].click()`);
                            await driver.sleep(2000);
                            await driver.executeScript(`return document.querySelector(".modal-body .submit-btn button").click()`);
                            
                            // Aksi sleep
                            await driver.sleep(3000);

                            // Aksi memilih salah satu jadwal konsultasi pada booking
                            let activeDays = await driver.executeScript(`return document.querySelectorAll('.modal-body span.day:not(.disabled,.blank,.sun,.sat)')`)
                            // await thrownAnError('There are no active days', await activeDays.length === 0);
                            let randomIndexDay = faker.number.int({ min: 0, max: await activeDays.length - 1 });
                            await driver.executeScript(`return document.querySelectorAll('.modal-body span.day:not(.disabled,.blank,.sun,.sat)')[${randomIndexDay}].click()`);
                            await driver.sleep(2000);
                            await driver.executeScript(`return document.querySelectorAll('.modal-body .time-picker-header .time-option')[0].click()`);
                            await driver.sleep(2000);
                            
                            // Aksi memilih salah satu hour time pada booking
                            let hourTime = await driver.executeScript(`return document.querySelectorAll(".modal-body .time-picker .hour-card:not(.disable)")`);
                            let indexTimePickerHeader = 1;
                            async function searchHourTime() {
                                if(await hourTime.length === 0) {
                                    await thrownAnError('All hours time is empty or disable', indexTimePickerHeader > await driver.executeScript(`return document.querySelectorAll('.modal-body .time-picker-header .time-option').length`));
                                    await driver.executeScript(`return document.querySelectorAll('.modal-body .time-picker-header .time-option')[${indexTimePickerHeader}].click()`);
                                    await driver.sleep(2000);
                                    hourTime = await driver.executeScript(`return document.querySelectorAll(".modal-body .time-picker .hour-card:not(.disable)")`);
                                    indexTimePickerHeader++;
                                    await searchHourTime();
                                } else {
                                    await driver.sleep(2000);
                                    await driver.executeScript(`return document.querySelectorAll('.modal-body .time-picker .hour-card:not(.disable)')[0].click()`);
                                }
                            }
                            await searchHourTime();

                            // Aksi sleep
                            await driver.sleep(3000);

                            // Aksi klik button next
                            await driver.executeScript(`return document.querySelector('.modal-body .submit-btn button').click()`);
                            
                            // Aksi sleep
                            await driver.sleep(3000);

                            // Aksi klik button 'Pilih Voucher'
                            await driver.executeScript(`return document.querySelector("#summary .card img[alt=discount]").click()`);
                            
                            // Aksi sleep
                            await driver.sleep(3000);

                            // Aksi memilih salah satu voucher yang tersedia
                            let voucherCard = await driver.executeScript(`return document.querySelectorAll("#voucher-card")`);
                            // await thrownAnError('Voucher is empty', await voucherCard.length === 0);
                            // let randomIndexVoucher = faker.number.int({ min: 0, max: await voucherCard.length - 1 });
                            await driver.sleep(2000);
                            if(await voucherCard.length === 0) {
                                await driver.findElement(By.css('.wrapper form input[name=search]')).sendKeys('KEXOTL');
                                await driver.sleep(3000);
                            }
                            await driver.executeScript(`return document.querySelectorAll("#voucher-card")[0].querySelector('p.detail').click()`);
                            
                            // Aksi sleep
                            await driver.sleep(3000);

                            // Expect results and add custom message for addtional description
                            let detailsVoucher = await driver.executeScript(`return document.querySelector(".modal-body .detail-voucher")`);
                            customMessages = [
                                await detailsVoucher.isDisplayed() ? 'Successfully get the details information about the voucher ✅' : 'Failed to get the details information about the voucher ❌'
                            ];
                            expect(await detailsVoucher.isDisplayed()).to.equal(true);

                        } catch (error) {
                            expect.fail(error);
                        }

                    });

                    it(`User - Check more details about payment after booked the reader from browser ${browser}`, async () => {

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

                            // Aksi klik menu tab payment
                            await driver.executeScript(`return document.querySelectorAll(".notification-wrapper .tab-title")[1].click()`);

                            // Aksi Sleep
                            await driver.sleep(10000);

                            // Aksi seleksi salah satu card notification payment untuk melihat rincian lebih detail nya
                            let notifications = await driver.executeScript(`return Array.from(document.querySelectorAll('#notification-card h1')).filter(value => value.innerText == 'Menunggu pembayaran')`);
                            await thrownAnError('Notification payment is empty', await notifications.length === 0);
                            await driver.sleep(2000);
                            await driver.executeScript(`return document.querySelectorAll('#notification-card')[0].querySelector('button.action-btn').click()`);

                            // Aksi sleep 
                            await driver.sleep(5000);

                            // Expect results and add custom message for addtional description
                            let summaryPayment = await driver.findElement(By.id('summary'));
                            customMessages = [
                                await summaryPayment.isDisplayed() ? 'Successfully directed into appropriate payment method when ordered before ✅' : 'Failed to see more details about payment ❌'
                            ]
                            expect(await summaryPayment.isDisplayed()).to.equal(true);

                        } catch (error) {
                            expect.fail(error);
                        }


                    });

                    break;

                case 2:
                    it.skip(`Reader - Test from browser ${browser}`, async () => {

                        try {
                            driver = await goToApp(browser, appHost);
                            await driver.manage().window().maximize();

                            // Aksi menunggu mengisi form login untuk melakukan authentication
                            await loginToApp(driver, user, browser, appHost);

                            // Aksi sleep
                            await driver.sleep(3000);

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