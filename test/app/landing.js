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

describe("Landing", () => {
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

    BROWSERS.forEach(browser => {

        // Desktop Version
        it(`Go to app or landing page from browser ${browser}`, async () => {

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

                // Expect results and add custom message for addtional description
                let currentPageUrl = await driver.getCurrentUrl();

                customMessages = [
                    currentPageUrl === appHost + '/' ? 'Successfully go to app ✅' : 'Failed go to app ❌'
                ]
                expect(currentPageUrl).to.equal(appHost + '/');

            } catch (error) {
                expect.fail(error);
            }


        });
        
        it(`Check the button 'Yuk, bacatarot!' from browser ${browser}`, async () => {

            try {

                driver = await goToApp(browser, appHost);
                await driver.manage().window().maximize();

                // Aksi menunggu modal content
                let modalContent = await driver.executeScript(`return document.querySelector('.modal-content')`);
                if(await modalContent?.isDisplayed()) {
                    await driver.wait(until.elementLocated(By.css('.modal-content')));              
                    await driver.findElement(By.css(".modal-content header button.close")).click();
                }

                // Aksi mengklik button 'Yuk, bacatarot!'
                await driver.executeScript(`return document.querySelector('.button-container .default-button[variant=cream]').click();`);

                // Aksi sleep 
                await driver.sleep(5000);

                // Expect results and add custom message for addtional description
                let currentPageUrl = await driver.getCurrentUrl();

                customMessages = [
                    currentPageUrl === appHost + '/auth' ? 'Successfully go into auth page ✅' : 'Failed go into auth page ❌',
                ]
                expect(currentPageUrl).to.equal(appHost + '/auth');

            } catch (error) {
                expect.fail(error);
            }


        });

        it(`Go into article page from browser ${browser}`, async () => {

            try {

                driver = await goToApp(browser, appHost);
                await driver.manage().window().maximize();

                // Aksi menunggu modal content
                let modalContent = await driver.executeScript(`return document.querySelector('.modal-content')`);
                if(await modalContent?.isDisplayed()) {
                    await driver.wait(until.elementLocated(By.css('.modal-content')));              
                    await driver.findElement(By.css(".modal-content header button.close")).click();
                }

                // Aksi mengklik menu tab article
                await driver.executeScript(`return document.querySelectorAll("ul.navbar-nav li.nav-item a.nav-link a")[1].click();`);

                // Aksi sleep 
                await driver.sleep(5000);

                // Expect results and add custom message for addtional description
                let currentPageUrl = await driver.getCurrentUrl();

                customMessages = [
                    currentPageUrl === appHost + '/article' ? 'Successfully go into article page ✅' : 'Failed go into article page ❌',
                ]
                expect(currentPageUrl).to.equal(appHost + '/article');

            } catch (error) {
                expect.fail(error);
            }


        });
        
        it(`Check if there's an article on the article page from browser ${browser}`, async () => {

            try {

                driver = await goToApp(browser, appHost);
                await driver.manage().window().maximize();

                // Aksi menunggu modal content
                let modalContent = await driver.executeScript(`return document.querySelector('.modal-content')`);
                if(await modalContent?.isDisplayed()) {
                    await driver.wait(until.elementLocated(By.css('.modal-content')));              
                    await driver.findElement(By.css(".modal-content header button.close")).click();
                }

                // Aksi mengklik menu tab article
                await driver.executeScript(`return document.querySelectorAll("ul.navbar-nav li.nav-item a.nav-link a")[1].click();`);

                // Aksi sleep 
                await driver.sleep(5000);

                // Aksi mengecek apakah article ada atau tidak
                let emptyArticle = await driver.executeScript(`return document.querySelectorAll('p.text-white');`);
                await thrownAnError(await emptyArticle[0].getAttribute('innerText'), await emptyArticle.length > 0);

                // Expect results and add custom message for addtional description
                let currentPageUrl = await driver.getCurrentUrl();

                customMessages = [
                    currentPageUrl === appHost + '/article' ? 'Successfully go into article page ✅' : 'Failed go into article page ❌',
                    emptyArticle.length === 0 ? 'There is an article on the page ✅' : 'There is no article on the page ❌'
                ]
                expect(currentPageUrl).to.equal(appHost + '/article');

            } catch (error) {
                expect.fail(error);
            }


        });
        
        it(`Go into reader page from browser ${browser}`, async () => {

            try {

                driver = await goToApp(browser, appHost);
                await driver.manage().window().maximize();

                // Aksi menunggu modal content
                let modalContent = await driver.executeScript(`return document.querySelector('.modal-content')`);
                if(await modalContent?.isDisplayed()) {
                    await driver.wait(until.elementLocated(By.css('.modal-content')));              
                    await driver.findElement(By.css(".modal-content header button.close")).click();
                }

                // Aksi mengklik menu tab article
                await driver.executeScript(`return document.querySelectorAll("ul.navbar-nav li.nav-item a.nav-link a")[2].click();`);

                // Aksi sleep 
                await driver.sleep(5000);

                // Expect results and add custom message for addtional description
                let currentPageUrl = await driver.getCurrentUrl();

                customMessages = [
                    currentPageUrl === appHost + '/councelor' ? 'Successfully go into reader page ✅' : 'Failed go into reader page ❌',
                ]
                expect(currentPageUrl).to.equal(appHost + '/councelor');

            } catch (error) {
                expect.fail(error);
            }


        });

        it(`Check if there's an reader or no on the reader page from browser ${browser}`, async () => {

            try {

                driver = await goToApp(browser, appHost);
                await driver.manage().window().maximize();

                // Aksi menunggu modal content
                let modalContent = await driver.executeScript(`return document.querySelector('.modal-content')`);
                if(await modalContent?.isDisplayed()) {
                    await driver.wait(until.elementLocated(By.css('.modal-content')));              
                    await driver.findElement(By.css(".modal-content header button.close")).click();
                }

                // Aksi mengklik menu tab article
                await driver.executeScript(`return document.querySelectorAll("ul.navbar-nav li.nav-item a.nav-link a")[2].click();`);

                // Aksi sleep 
                await driver.sleep(5000);

                // Aksi mengecek apakah article ada atau tidak
                let emptyArticle = await driver.executeScript(`return document.querySelectorAll('div#user-overview');`);
                await thrownAnError('Sorry there is no a reader on the page', await emptyArticle.length === 0);

                // Expect results and add custom message for addtional description
                let currentPageUrl = await driver.getCurrentUrl();

                customMessages = [
                    currentPageUrl === appHost + '/councelor' ? 'Successfully go into councelor page ✅' : 'Failed go into councelor page ❌',
                    emptyArticle.length === 0 ? 'There is an councelor on the page ✅' : 'There is no councelor on the page ❌'
                ]
                expect(currentPageUrl).to.equal(appHost + '/councelor');

            } catch (error) {
                expect.fail(error);
            }


        });
        
        it(`Check the button pick of reader on reader or councelor page from browser (before login) ${browser}`, async () => {

            try {

                driver = await goToApp(browser, appHost);
                await driver.manage().window().maximize();

                // Aksi menunggu modal content
                let modalContent = await driver.executeScript(`return document.querySelector('.modal-content')`);
                if(await modalContent?.isDisplayed()) {
                    await driver.wait(until.elementLocated(By.css('.modal-content')));              
                    await driver.findElement(By.css(".modal-content header button.close")).click();
                }

                // Aksi sleep 
                await driver.sleep(3000);

                // Aksi mengklik menu tab article
                await driver.executeScript(`return document.querySelectorAll("ul.navbar-nav li.nav-item a.nav-link a")[2].click();`);

                // Aksi sleep 
                await driver.sleep(3000);

                // Aksi mengklik menu tab article
                let userOverview = await driver.executeScript(`return document.querySelectorAll('#user-overview button.action-btn')`);
                await driver.executeScript(`return document.querySelectorAll("#user-overview button.action-btn")[${faker.number.int({ min: 0, max: await userOverview.length - 1 })}].click();`);

                // Aksi sleep 
                await driver.sleep(3000);

                // Expect results and add custom message for addtional description
                let currentPageUrl = await driver.getCurrentUrl();

                customMessages = [
                    currentPageUrl === appHost + '/auth' ? 'Successfully go into auth page after clicked button pick on reader or councelor page ✅' : 'Failed go into auth page ❌',
                ]
                expect(currentPageUrl).to.equal(appHost + '/auth');

            } catch (error) {
                expect.fail(error);
            }


        });
        
        it(`Go into about page from browser ${browser}`, async () => {

            try {

                driver = await goToApp(browser, appHost);
                await driver.manage().window().maximize();

                // Aksi menunggu modal content
                let modalContent = await driver.executeScript(`return document.querySelector('.modal-content')`);
                if(await modalContent?.isDisplayed()) {
                    await driver.wait(until.elementLocated(By.css('.modal-content')));              
                    await driver.findElement(By.css(".modal-content header button.close")).click();
                }

                // Aksi mengklik menu tab article
                await driver.executeScript(`return document.querySelectorAll("ul.navbar-nav li.nav-item a.nav-link a")[3].click();`);

                // Aksi sleep 
                await driver.sleep(5000);

                // Expect results and add custom message for addtional description
                let currentPageUrl = await driver.getCurrentUrl();

                customMessages = [
                    currentPageUrl === appHost + '/about' ? 'Successfully go into about page ✅' : 'Failed go into about page ❌',
                ]
                expect(currentPageUrl).to.equal(appHost + '/about');

            } catch (error) {
                expect.fail(error);
            }


        });

        // Mobile Version
        it(`Check the dropdown navbar list on mobile version from browser ${browser}`, async () => {

            try {

                driver = await goToApp(browser, appHost);
                // Aksi sleep
                await driver.sleep(3000);
                await driver.manage().window().setRect({ width: 384, height: 1024 });

                // Aksi klik masuk untuk menuju ke halaman login/authentication
                let modalContent = await driver.executeScript(`return document.querySelector('.modal-content')`);
                if(await modalContent?.isDisplayed()) {
                    await driver.wait(until.elementLocated(By.css('.modal-content')));              
                    await driver.findElement(By.css(".modal-content header button.close")).click();
                }

                // Aksi mengklik button login 
                await driver.findElement(By.css("button.navbar-toggler")).click();
                await driver.sleep(1000);
                
                // Aksi mengecek dropdown navbar item ketika telah mengklik toggler button
                let dropdownNavbar = await driver.findElement(By.css("ul.navbar-nav"));
                await thrownAnError('Dropdown navbar item is not available', await !dropdownNavbar.isDisplayed());
                
                // Expect results and add custom message for addtional description
                customMessages = [
                    await dropdownNavbar.isDisplayed() ? 'Dropdown navbar item is available ✅' : 'Dropdown navbar item is not available ❌'
                ];
                expect(await dropdownNavbar.isDisplayed()).to.equal(true);

            } catch (error) {
                expect.fail(error);
            }


        });
    })



});