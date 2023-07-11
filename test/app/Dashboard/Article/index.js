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
                    it(`User - Test from browser ${browser}`, async () => {

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

                case 2:
                    it(`Reader - Create an article from browser ${browser}`, async () => {

                        try {

                            // Aksi masuk ke dalam halaman browser
                            driver = await goToApp(browser, appHost);
                            await driver.manage().window().maximize();

                            // Aksi menunggu mengisi form login untuk melakukan authentication
                            await loginToApp(driver, user, browser, appHost);

                            // Aksi Sleep
                            await driver.sleep(3000);

                            // Aksi mengklik menu tab artikel
                            await driver.executeScript(`return document.querySelectorAll("ul.navbar-nav li.nav-item a a")[1].click()`);
                            
                            // Aksi Sleep
                            await driver.sleep(3000);

                            // Aksi klik tombol 'Tambah Artikel'
                            await driver.executeScript(`return document.querySelector('button#outline-button').click()`);
                            
                            // Aksi Sleep
                            await driver.sleep(3000);

                            // Aksi fill the form of article
                            let title = faker.lorem.words();
                            let description = faker.lorem.sentence();
                            await driver.sleep(1000);
                            await driver.findElement(By.css('textarea.title-inpt')).sendKeys(title);
                            await driver.executeScript(`return document.querySelector('.editor__content .ProseMirror p').textContent = "${description}"`);
                            // Aksi Sleep
                            await driver.sleep(3000);
                            let isAllFilled = await Promise.all([
                                await driver.findElement(By.css('textarea.title-inpt')).getAttribute('value'),
                                await driver.findElement(By.css('.editor__content .ProseMirror p')).getAttribute('innerText'),
                            ]).then(results => results.every(value => value != ''));
                            await thrownAnError('Input form create article is empty', !isAllFilled);
                            
                            // Aksi Sleep
                            await driver.sleep(3000);

                            if(isAllFilled) await driver.executeScript(`return document.querySelectorAll('button.menubar__button.desktop-tablet img')[document.querySelectorAll('button.menubar__button.desktop-tablet').length - 1].click()`);

                            // Aksi Sleep
                            await driver.sleep(5000);

                            // Aksi scroll to bottom of article
                            await driver.executeScript('window.scrollTo(0, document.body.scrollHeight)');
                            
                            // Aksi Sleep
                            await driver.sleep(3000);

                            let articleCard = await driver.executeScript(`return document.querySelectorAll('#article-card-m .flex-column h1')`);
                            let findArticle = [];

                            for (let index = 0; index < await articleCard.length; index++) {
                                if(await articleCard[index].getAttribute('innerText') === title) {
                                    findArticle.push(await articleCard[index]);
                                }
                            }
                            
                            // Aksi sleep
                            await driver.sleep(5000);

                            // Expect results and add custom message for addtional description
                            customMessages = [
                                findArticle.length > 0 ? 'Successfully created a new article ✅' : 'Failed to create a new article ❌'
                            ]
                            expect(findArticle.length).to.greaterThan(0);
                            
                        } catch (error) {
                            expect.fail(error);
                        }


                    });

                    it(`Reader - Editor toolbar bold article from browser ${browser}`, async () => {

                        try {

                            // Aksi masuk ke dalam halaman browser
                            driver = await goToApp(browser, appHost);
                            await driver.manage().window().maximize();

                            // Aksi menunggu mengisi form login untuk melakukan authentication
                            await loginToApp(driver, user, browser, appHost);

                            // Aksi Sleep
                            await driver.sleep(3000);

                            // Aksi mengklik menu tab artikel
                            await driver.executeScript(`return document.querySelectorAll("ul.navbar-nav li.nav-item a a")[1].click()`);
                            
                            // Aksi Sleep
                            await driver.sleep(3000);

                            // Aksi klik tombol 'Tambah Artikel'
                            await driver.executeScript(`return document.querySelector('button#outline-button').click()`);
                            
                            // Aksi Sleep
                            await driver.sleep(3000);

                            // Aksi fill the form of article
                            let title = faker.lorem.words();
                            let description = faker.lorem.sentence();
                            await driver.sleep(1000);
                            await driver.findElement(By.css('textarea.title-inpt')).sendKeys(title);
                            await driver.executeScript(`return document.querySelector('.editor__content .ProseMirror p').textContent = "${description}"`);
                            // Aksi Sleep
                            await driver.sleep(3000);
                            let isAllFilled = await Promise.all([
                                await driver.findElement(By.css('textarea.title-inpt')).getAttribute('value'),
                                await driver.findElement(By.css('.editor__content .ProseMirror p')).getAttribute('innerText'),
                            ]).then(results => results.every(value => value != ''));
                            await thrownAnError('Input form create article is empty', !isAllFilled);
                            
                            // Aksi Sleep
                            await driver.sleep(3000);

                            if(isAllFilled) {

                                let clickable = await driver.findElement(By.css(".editor__content .ProseMirror"));
                                let action = await driver.actions({async: true});
                                await action.move({origin: await clickable}).press().perform();
                                await driver.sleep(2000);
                                await driver.executeScript(`return document.execCommand('selectAll', false, null);`);
                                // Aksi Sleep
                                await driver.sleep(3000);
                                await driver.executeScript(`return document.querySelectorAll('.editor-control .menubar .menubar__button')[0].click()`);
                                await driver.sleep(2000);
                                clickable = await driver.findElement(By.css(".editor__content .ProseMirror"));
                                action = await driver.actions({async: true});
                                await action.move({origin: await clickable}).press().perform();
                            }

                            // Aksi Sleep
                            await driver.sleep(3000);

                            // Expect results and add custom message for addtional description
                            let descriptionArticle = await driver.executeScript(`return document.querySelector('.editor__content .ProseMirror').innerHTML;`);
                            customMessages = [
                                descriptionArticle.includes('strong') ? 'Successfully use bold of editor toolbar in description article ✅' : 'Failed to use bold of editor toolbar in description article ❌'
                            ]
                            expect(descriptionArticle.includes('strong')).to.equal(true);

                        } catch (error) {
                            expect.fail(error);
                        }

                    });
                    
                    it(`Reader - Editor toolbar italic article from browser ${browser}`, async () => {

                        try {

                            // Aksi masuk ke dalam halaman browser
                            driver = await goToApp(browser, appHost);
                            await driver.manage().window().maximize();

                            // Aksi menunggu mengisi form login untuk melakukan authentication
                            await loginToApp(driver, user, browser, appHost);

                            // Aksi Sleep
                            await driver.sleep(3000);

                            // Aksi mengklik menu tab artikel
                            await driver.executeScript(`return document.querySelectorAll("ul.navbar-nav li.nav-item a a")[1].click()`);
                            
                            // Aksi Sleep
                            await driver.sleep(3000);

                            // Aksi klik tombol 'Tambah Artikel'
                            await driver.executeScript(`return document.querySelector('button#outline-button').click()`);
                            
                            // Aksi Sleep
                            await driver.sleep(3000);

                            // Aksi fill the form of article
                            let title = faker.lorem.words();
                            let description = faker.lorem.sentence();
                            await driver.sleep(1000);
                            await driver.findElement(By.css('textarea.title-inpt')).sendKeys(title);
                            await driver.executeScript(`return document.querySelector('.editor__content .ProseMirror p').textContent = "${description}"`);
                            // Aksi Sleep
                            await driver.sleep(3000);
                            let isAllFilled = await Promise.all([
                                await driver.findElement(By.css('textarea.title-inpt')).getAttribute('value'),
                                await driver.findElement(By.css('.editor__content .ProseMirror p')).getAttribute('innerText'),
                            ]).then(results => results.every(value => value != ''));
                            await thrownAnError('Input form create article is empty', !isAllFilled);
                            
                            // Aksi Sleep
                            await driver.sleep(3000);

                            if(isAllFilled) {

                                let clickable = await driver.findElement(By.css(".editor__content .ProseMirror"));
                                let action = await driver.actions({async: true});
                                await action.move({origin: await clickable}).press().perform();
                                await driver.sleep(2000);
                                await driver.executeScript(`return document.execCommand('selectAll', false, null);`);
                                // Aksi Sleep
                                await driver.sleep(3000);
                                await driver.executeScript(`return document.querySelectorAll('.editor-control .menubar .menubar__button')[1].click()`);
                                await driver.sleep(2000);
                                clickable = await driver.findElement(By.css(".editor__content .ProseMirror"));
                                action = await driver.actions({async: true});
                                await action.move({origin: await clickable}).press().perform();
                            }

                            // Aksi Sleep
                            await driver.sleep(3000);

                            // Expect results and add custom message for addtional description
                            let descriptionArticle = await driver.executeScript(`return document.querySelector('.editor__content .ProseMirror').innerHTML;`);
                            customMessages = [
                                descriptionArticle.includes('em') ? 'Successfully use italic of editor toolbar in description article' : 'Failed use italic of editor toolbar in description article'
                            ]
                            expect(descriptionArticle.includes('em')).to.equal(true);

                        } catch (error) {
                            expect.fail(error);
                        }

                    });
                    
                    it(`Reader - Editor toolbar underline article from browser ${browser}`, async () => {

                        try {

                            // Aksi masuk ke dalam halaman browser
                            driver = await goToApp(browser, appHost);
                            await driver.manage().window().maximize();

                            // Aksi menunggu mengisi form login untuk melakukan authentication
                            await loginToApp(driver, user, browser, appHost);

                            // Aksi Sleep
                            await driver.sleep(3000);

                            // Aksi mengklik menu tab artikel
                            await driver.executeScript(`return document.querySelectorAll("ul.navbar-nav li.nav-item a a")[1].click()`);
                            
                            // Aksi Sleep
                            await driver.sleep(3000);

                            // Aksi klik tombol 'Tambah Artikel'
                            await driver.executeScript(`return document.querySelector('button#outline-button').click()`);
                            
                            // Aksi Sleep
                            await driver.sleep(3000);

                            // Aksi fill the form of article
                            let title = faker.lorem.words();
                            let description = faker.lorem.sentence();
                            await driver.sleep(1000);
                            await driver.findElement(By.css('textarea.title-inpt')).sendKeys(title);
                            await driver.executeScript(`return document.querySelector('.editor__content .ProseMirror p').textContent = "${description}"`);
                            // Aksi Sleep
                            await driver.sleep(3000);
                            let isAllFilled = await Promise.all([
                                await driver.findElement(By.css('textarea.title-inpt')).getAttribute('value'),
                                await driver.findElement(By.css('.editor__content .ProseMirror p')).getAttribute('innerText'),
                            ]).then(results => results.every(value => value != ''));
                            await thrownAnError('Input form create article is empty', !isAllFilled);
                            
                            // Aksi Sleep
                            await driver.sleep(3000);

                            if(isAllFilled) {

                                let clickable = await driver.findElement(By.css(".editor__content .ProseMirror"));
                                let action = await driver.actions({async: true});
                                await action.move({origin: await clickable}).press().perform();
                                await driver.sleep(2000);
                                await driver.executeScript(`return document.execCommand('selectAll', false, null);`);
                                // Aksi Sleep
                                await driver.sleep(3000);
                                await driver.executeScript(`return document.querySelectorAll('.editor-control .menubar .menubar__button')[2].click()`);
                                await driver.sleep(2000);
                                clickable = await driver.findElement(By.css(".editor__content .ProseMirror"));
                                action = await driver.actions({async: true});
                                await action.move({origin: await clickable}).press().perform();
                            }

                            // Aksi Sleep
                            await driver.sleep(3000);

                            // Expect results and add custom message for addtional description
                            let descriptionArticle = await driver.executeScript(`return document.querySelector('.editor__content .ProseMirror').innerHTML;`);
                            customMessages = [
                                descriptionArticle.includes("<u>") ? 'Successfully use underline of editor toolbar in description article' : 'Failed use underline of editor toolbar in description article'
                            ]
                            expect(descriptionArticle.includes("<u>")).to.equal(true);

                        } catch (error) {
                            expect.fail(error);
                        }

                    });
                    
                    it(`Reader - Editor toolbar heading one article from browser ${browser}`, async () => {

                        try {

                            // Aksi masuk ke dalam halaman browser
                            driver = await goToApp(browser, appHost);
                            await driver.manage().window().maximize();

                            // Aksi menunggu mengisi form login untuk melakukan authentication
                            await loginToApp(driver, user, browser, appHost);

                            // Aksi Sleep
                            await driver.sleep(3000);

                            // Aksi mengklik menu tab artikel
                            await driver.executeScript(`return document.querySelectorAll("ul.navbar-nav li.nav-item a a")[1].click()`);
                            
                            // Aksi Sleep
                            await driver.sleep(3000);

                            // Aksi klik tombol 'Tambah Artikel'
                            await driver.executeScript(`return document.querySelector('button#outline-button').click()`);
                            
                            // Aksi Sleep
                            await driver.sleep(3000);

                            // Aksi fill the form of article
                            let title = faker.lorem.words();
                            let description = faker.lorem.sentence();
                            await driver.sleep(1000);
                            await driver.findElement(By.css('textarea.title-inpt')).sendKeys(title);
                            await driver.executeScript(`return document.querySelector('.editor__content .ProseMirror p').textContent = "${description}"`);
                            // Aksi Sleep
                            await driver.sleep(3000);
                            let isAllFilled = await Promise.all([
                                await driver.findElement(By.css('textarea.title-inpt')).getAttribute('value'),
                                await driver.findElement(By.css('.editor__content .ProseMirror p')).getAttribute('innerText'),
                            ]).then(results => results.every(value => value != ''));
                            await thrownAnError('Input form create article is empty', !isAllFilled);
                            
                            // Aksi Sleep
                            await driver.sleep(3000);

                            if(isAllFilled) {

                                let clickable = await driver.findElement(By.css(".editor__content .ProseMirror"));
                                let action = await driver.actions({async: true});
                                await action.move({origin: await clickable}).press().perform();
                                await driver.sleep(2000);
                                await driver.executeScript(`return document.execCommand('selectAll', false, null);`);
                                // Aksi Sleep
                                await driver.sleep(3000);
                                await driver.executeScript(`return document.querySelectorAll('.editor-control .menubar .menubar__button')[3].click()`);
                                await driver.sleep(2000);
                                clickable = await driver.findElement(By.css(".editor__content .ProseMirror"));
                                action = await driver.actions({async: true});
                                await action.move({origin: await clickable}).press().perform();
                            }

                            // Aksi Sleep
                            await driver.sleep(3000);

                            // Expect results and add custom message for addtional description
                            let descriptionArticle = await driver.executeScript(`return document.querySelector('.editor__content .ProseMirror').innerHTML;`);
                            customMessages = [
                                descriptionArticle.includes("<h1>") ? 'Successfully use heading one of editor toolbar in description article' : 'Failed use heading one of editor toolbar in description article'
                            ]
                            expect(descriptionArticle.includes("<h1>")).to.equal(true);

                        } catch (error) {
                            expect.fail(error);
                        }

                    });
                    
                    it(`Reader - Editor toolbar heading two article from browser ${browser}`, async () => {

                        try {

                            // Aksi masuk ke dalam halaman browser
                            driver = await goToApp(browser, appHost);
                            await driver.manage().window().maximize();

                            // Aksi menunggu mengisi form login untuk melakukan authentication
                            await loginToApp(driver, user, browser, appHost);

                            // Aksi Sleep
                            await driver.sleep(3000);

                            // Aksi mengklik menu tab artikel
                            await driver.executeScript(`return document.querySelectorAll("ul.navbar-nav li.nav-item a a")[1].click()`);
                            
                            // Aksi Sleep
                            await driver.sleep(3000);

                            // Aksi klik tombol 'Tambah Artikel'
                            await driver.executeScript(`return document.querySelector('button#outline-button').click()`);
                            
                            // Aksi Sleep
                            await driver.sleep(3000);

                            // Aksi fill the form of article
                            let title = faker.lorem.words();
                            let description = faker.lorem.sentence();
                            await driver.sleep(1000);
                            await driver.findElement(By.css('textarea.title-inpt')).sendKeys(title);
                            await driver.executeScript(`return document.querySelector('.editor__content .ProseMirror p').textContent = "${description}"`);
                            // Aksi Sleep
                            await driver.sleep(3000);
                            let isAllFilled = await Promise.all([
                                await driver.findElement(By.css('textarea.title-inpt')).getAttribute('value'),
                                await driver.findElement(By.css('.editor__content .ProseMirror p')).getAttribute('innerText'),
                            ]).then(results => results.every(value => value != ''));
                            await thrownAnError('Input form create article is empty', !isAllFilled);
                            
                            // Aksi Sleep
                            await driver.sleep(3000);

                            if(isAllFilled) {

                                let clickable = await driver.findElement(By.css(".editor__content .ProseMirror"));
                                let action = await driver.actions({async: true});
                                await action.move({origin: await clickable}).press().perform();
                                await driver.sleep(2000);
                                await driver.executeScript(`return document.execCommand('selectAll', false, null);`);
                                // Aksi Sleep
                                await driver.sleep(3000);
                                await driver.executeScript(`return document.querySelectorAll('.editor-control .menubar .menubar__button')[4].click()`);
                                await driver.sleep(2000);
                                clickable = await driver.findElement(By.css(".editor__content .ProseMirror"));
                                action = await driver.actions({async: true});
                                await action.move({origin: await clickable}).press().perform();
                            }

                            // Aksi Sleep
                            await driver.sleep(3000);

                            // Expect results and add custom message for addtional description
                            let descriptionArticle = await driver.executeScript(`return document.querySelector('.editor__content .ProseMirror').innerHTML;`);
                            customMessages = [
                                descriptionArticle.includes('<h2>') ? 'Successfully use heading two of editor toolbar in description article' : 'Failed use heading two of editor toolbar in description article'
                            ]
                            expect(descriptionArticle.includes('<h2>')).to.equal(true);

                        } catch (error) {
                            expect.fail(error);
                        }

                    });
                    
                    it(`Reader - Editor toolbar heading three article from browser ${browser}`, async () => {

                        try {

                            // Aksi masuk ke dalam halaman browser
                            driver = await goToApp(browser, appHost);
                            await driver.manage().window().maximize();

                            // Aksi menunggu mengisi form login untuk melakukan authentication
                            await loginToApp(driver, user, browser, appHost);

                            // Aksi Sleep
                            await driver.sleep(3000);

                            // Aksi mengklik menu tab artikel
                            await driver.executeScript(`return document.querySelectorAll("ul.navbar-nav li.nav-item a a")[1].click()`);
                            
                            // Aksi Sleep
                            await driver.sleep(3000);

                            // Aksi klik tombol 'Tambah Artikel'
                            await driver.executeScript(`return document.querySelector('button#outline-button').click()`);
                            
                            // Aksi Sleep
                            await driver.sleep(3000);

                            // Aksi fill the form of article
                            let title = faker.lorem.words();
                            let description = faker.lorem.sentence();
                            await driver.sleep(1000);
                            await driver.findElement(By.css('textarea.title-inpt')).sendKeys(title);
                            await driver.executeScript(`return document.querySelector('.editor__content .ProseMirror p').textContent = "${description}"`);
                            // Aksi Sleep
                            await driver.sleep(3000);
                            let isAllFilled = await Promise.all([
                                await driver.findElement(By.css('textarea.title-inpt')).getAttribute('value'),
                                await driver.findElement(By.css('.editor__content .ProseMirror p')).getAttribute('innerText'),
                            ]).then(results => results.every(value => value != ''));
                            await thrownAnError('Input form create article is empty', !isAllFilled);
                            
                            // Aksi Sleep
                            await driver.sleep(3000);

                            if(isAllFilled) {

                                let clickable = await driver.findElement(By.css(".editor__content .ProseMirror"));
                                let action = await driver.actions({async: true});
                                await action.move({origin: await clickable}).press().perform();
                                await driver.sleep(2000);
                                await driver.executeScript(`return document.execCommand('selectAll', false, null);`);
                                // Aksi Sleep
                                await driver.sleep(3000);
                                await driver.executeScript(`return document.querySelectorAll('.editor-control .menubar .menubar__button')[5].click()`);
                                await driver.sleep(2000);
                                clickable = await driver.findElement(By.css(".editor__content .ProseMirror"));
                                action = await driver.actions({async: true});
                                await action.move({origin: await clickable}).press().perform();
                            }

                            // Aksi Sleep
                            await driver.sleep(3000);

                            // Expect results and add custom message for addtional description
                            let descriptionArticle = await driver.executeScript(`return document.querySelector('.editor__content .ProseMirror').innerHTML;`);
                            customMessages = [
                                descriptionArticle.includes("<h3>") ? 'Successfully use heading three of editor toolbar in description article' : 'Failed use heading three of editor toolbar in description article'
                            ]
                            expect(descriptionArticle.includes("<h3>")).to.equal(true);

                        } catch (error) {
                            expect.fail(error);
                        }

                    });
                    
                    it(`Reader - Editor toolbar list article from browser ${browser}`, async () => {

                        try {

                            // Aksi masuk ke dalam halaman browser
                            driver = await goToApp(browser, appHost);
                            await driver.manage().window().maximize();

                            // Aksi menunggu mengisi form login untuk melakukan authentication
                            await loginToApp(driver, user, browser, appHost);

                            // Aksi Sleep
                            await driver.sleep(3000);

                            // Aksi mengklik menu tab artikel
                            await driver.executeScript(`return document.querySelectorAll("ul.navbar-nav li.nav-item a a")[1].click()`);
                            
                            // Aksi Sleep
                            await driver.sleep(3000);

                            // Aksi klik tombol 'Tambah Artikel'
                            await driver.executeScript(`return document.querySelector('button#outline-button').click()`);
                            
                            // Aksi Sleep
                            await driver.sleep(3000);

                            // Aksi fill the form of article
                            let title = faker.lorem.words();
                            let description = faker.lorem.sentence();
                            await driver.sleep(1000);
                            await driver.findElement(By.css('textarea.title-inpt')).sendKeys(title);
                            await driver.executeScript(`return document.querySelector('.editor__content .ProseMirror p').textContent = "${description}"`);
                            // Aksi Sleep
                            await driver.sleep(3000);
                            let isAllFilled = await Promise.all([
                                await driver.findElement(By.css('textarea.title-inpt')).getAttribute('value'),
                                await driver.findElement(By.css('.editor__content .ProseMirror p')).getAttribute('innerText'),
                            ]).then(results => results.every(value => value != ''));
                            await thrownAnError('Input form create article is empty', !isAllFilled);
                            
                            // Aksi Sleep
                            await driver.sleep(3000);

                            if(isAllFilled) {

                                let clickable = await driver.findElement(By.css(".editor__content .ProseMirror"));
                                let action = await driver.actions({async: true});
                                await action.move({origin: await clickable}).press().perform();
                                await driver.sleep(2000);
                                await driver.executeScript(`return document.execCommand('selectAll', false, null);`);
                                // Aksi Sleep
                                await driver.sleep(3000);
                                await driver.executeScript(`return document.querySelectorAll('.editor-control .menubar .menubar__button')[6].click()`);
                                await driver.sleep(2000);
                                clickable = await driver.findElement(By.css(".editor__content .ProseMirror"));
                                action = await driver.actions({async: true});
                                await action.move({origin: await clickable}).press().perform();
                            }

                            // Aksi Sleep
                            await driver.sleep(3000);

                            // Expect results and add custom message for addtional description
                            let descriptionArticle = await driver.executeScript(`return document.querySelector('.editor__content .ProseMirror').innerHTML;`);
                            customMessages = [
                                descriptionArticle.includes("<ul>") ? 'Successfully use list of editor toolbar in description article' : 'Failed use list of editor toolbar in description article'
                            ]
                            expect(descriptionArticle.includes("<ul>")).to.equal(true);

                        } catch (error) {
                            expect.fail(error);
                        }

                    });
                    
                    it(`Reader - Editor toolbar quote article from browser ${browser}`, async () => {

                        try {

                            // Aksi masuk ke dalam halaman browser
                            driver = await goToApp(browser, appHost);
                            await driver.manage().window().maximize();

                            // Aksi menunggu mengisi form login untuk melakukan authentication
                            await loginToApp(driver, user, browser, appHost);

                            // Aksi Sleep
                            await driver.sleep(3000);

                            // Aksi mengklik menu tab artikel
                            await driver.executeScript(`return document.querySelectorAll("ul.navbar-nav li.nav-item a a")[1].click()`);
                            
                            // Aksi Sleep
                            await driver.sleep(3000);

                            // Aksi klik tombol 'Tambah Artikel'
                            await driver.executeScript(`return document.querySelector('button#outline-button').click()`);
                            
                            // Aksi Sleep
                            await driver.sleep(3000);

                            // Aksi fill the form of article
                            let title = faker.lorem.words();
                            let description = faker.lorem.sentence();
                            await driver.sleep(1000);
                            await driver.findElement(By.css('textarea.title-inpt')).sendKeys(title);
                            await driver.executeScript(`return document.querySelector('.editor__content .ProseMirror p').textContent = "${description}"`);
                            // Aksi Sleep
                            await driver.sleep(3000);
                            let isAllFilled = await Promise.all([
                                await driver.findElement(By.css('textarea.title-inpt')).getAttribute('value'),
                                await driver.findElement(By.css('.editor__content .ProseMirror p')).getAttribute('innerText'),
                            ]).then(results => results.every(value => value != ''));
                            await thrownAnError('Input form create article is empty', !isAllFilled);
                            
                            // Aksi Sleep
                            await driver.sleep(3000);

                            if(isAllFilled) {

                                let clickable = await driver.findElement(By.css(".editor__content .ProseMirror"));
                                let action = await driver.actions({async: true});
                                await action.move({origin: await clickable}).press().perform();
                                await driver.sleep(2000);
                                await driver.executeScript(`return document.execCommand('selectAll', false, null);`);
                                // Aksi Sleep
                                await driver.sleep(3000);
                                await driver.executeScript(`return document.querySelectorAll('.editor-control .menubar .menubar__button')[7].click()`);
                                await driver.sleep(2000);
                                clickable = await driver.findElement(By.css(".editor__content .ProseMirror"));
                                action = await driver.actions({async: true});
                                await action.move({origin: await clickable}).press().perform();
                            }

                            // Aksi Sleep
                            await driver.sleep(3000);

                            // Expect results and add custom message for addtional description
                            let descriptionArticle = await driver.executeScript(`return document.querySelector('.editor__content .ProseMirror').innerHTML;`);
                            customMessages = [
                                descriptionArticle.includes("<blockquote>") ? 'Successfully use quote of editor toolbar in description article' : 'Failed use quote of editor toolbar in description article'
                            ]
                            expect(descriptionArticle.includes("<blockquote>")).to.equal(true);

                        } catch (error) {
                            expect.fail(error);
                        }

                    });
                    
                    it(`Reader - Editor toolbar image article from browser ${browser}`, async () => {

                        try {

                            // Aksi masuk ke dalam halaman browser
                            driver = await goToApp(browser, appHost);
                            await driver.manage().window().maximize();

                            // Aksi menunggu mengisi form login untuk melakukan authentication
                            await loginToApp(driver, user, browser, appHost);

                            // Aksi Sleep
                            await driver.sleep(3000);

                            // Aksi mengklik menu tab artikel
                            await driver.executeScript(`return document.querySelectorAll("ul.navbar-nav li.nav-item a a")[1].click()`);
                            
                            // Aksi Sleep
                            await driver.sleep(3000);

                            // Aksi klik tombol 'Tambah Artikel'
                            await driver.executeScript(`return document.querySelector('button#outline-button').click()`);
                            
                            // Aksi Sleep
                            await driver.sleep(3000);

                            // Aksi fill the form of article
                            let title = faker.lorem.words();
                            let description = faker.lorem.sentence();
                            await driver.sleep(1000);
                            await driver.findElement(By.css('textarea.title-inpt')).sendKeys(title);
                            await driver.executeScript(`return document.querySelector('.editor__content .ProseMirror p').textContent = "${description}"`);
                            // Aksi Sleep
                            await driver.sleep(3000);
                            let isAllFilled = await Promise.all([
                                await driver.findElement(By.css('textarea.title-inpt')).getAttribute('value'),
                                await driver.findElement(By.css('.editor__content .ProseMirror p')).getAttribute('innerText'),
                            ]).then(results => results.every(value => value != ''));
                            await thrownAnError('Input form create article is empty', !isAllFilled);
                            
                            // Aksi Sleep
                            await driver.sleep(3000);

                            if(isAllFilled) {
                                // Aksi upload file image
                                await driver.findElement(By.css('input[type=file].file-input')).sendKeys(path.resolve('./resources/images/profile.png'))
                            }

                            // Aksi Sleep
                            await driver.sleep(3000);

                            // Expect results and add custom message for addtional description
                            let articleImageInput = await driver.findElement(By.css('.article-img-input'));
                            customMessages = [
                                await articleImageInput.isDisplayed() ? 'Successfully use image of editor toolbar in description article' : 'Failed use image of editor toolbar in description article'
                            ]
                            expect(await articleImageInput.isDisplayed()).to.equal(true);

                        } catch (error) {
                            expect.fail(error);
                        }

                    });
                    
                    it(`Reader - Editor toolbar undo article from browser ${browser}`, async () => {

                        try {

                            // Aksi masuk ke dalam halaman browser
                            driver = await goToApp(browser, appHost);
                            await driver.manage().window().maximize();

                            // Aksi menunggu mengisi form login untuk melakukan authentication
                            await loginToApp(driver, user, browser, appHost);

                            // Aksi Sleep
                            await driver.sleep(3000);

                            // Aksi mengklik menu tab artikel
                            await driver.executeScript(`return document.querySelectorAll("ul.navbar-nav li.nav-item a a")[1].click()`);
                            
                            // Aksi Sleep
                            await driver.sleep(3000);

                            // Aksi klik tombol 'Tambah Artikel'
                            await driver.executeScript(`return document.querySelector('button#outline-button').click()`);
                            
                            // Aksi Sleep
                            await driver.sleep(3000);

                            // Aksi fill the form of article
                            let oldTextDescription = await driver.executeScript(`return document.querySelector('.editor__content .ProseMirror').innerHTML`);
                            let title = faker.lorem.words();
                            let description = faker.lorem.sentence();
                            await driver.sleep(1000);
                            await driver.findElement(By.css('textarea.title-inpt')).sendKeys(title);
                            await driver.executeScript(`return document.querySelector('.editor__content .ProseMirror p').textContent = "${description}"`);
                            // Aksi Sleep
                            await driver.sleep(3000);
                            let isAllFilled = await Promise.all([
                                await driver.findElement(By.css('textarea.title-inpt')).getAttribute('value'),
                                await driver.findElement(By.css('.editor__content .ProseMirror p')).getAttribute('innerText'),
                            ]).then(results => results.every(value => value != ''));
                            await thrownAnError('Input form create article is empty', !isAllFilled);
                            
                            // Aksi Sleep
                            await driver.sleep(3000);

                            if(isAllFilled) {

                                let clickable = await driver.findElement(By.css(".editor__content .ProseMirror"));
                                let action = await driver.actions({async: true});
                                await action.move({origin: await clickable}).press().perform();
                                await driver.sleep(2000);
                                await driver.executeScript(`return document.execCommand('selectAll', false, null);`);
                                // Aksi Sleep
                                await driver.sleep(3000);
                                await driver.executeScript(`return document.querySelectorAll('.editor-control .menubar .menubar__button')[9].click()`);
                                await driver.sleep(2000);
                                clickable = await driver.findElement(By.css(".editor__content .ProseMirror"));
                                action = await driver.actions({async: true});
                                await action.move({origin: await clickable}).press().perform();
                            }

                            // Aksi Sleep
                            await driver.sleep(3000);

                            // Expect results and add custom message for addtional description
                            let undoTextDescription = await driver.executeScript(`return document.querySelector('.editor__content .ProseMirror').innerHTML;`);
                            customMessages = [
                                await oldTextDescription === await undoTextDescription ? 'Successfully use undo of editor toolbar in description article' : 'Failed use undo of editor toolbar in description article'
                            ]
                            expect(await oldTextDescription === undoTextDescription).to.equal(true);

                        } catch (error) {
                            expect.fail(error);
                        }

                    });
                    
                    it(`Reader - Editor toolbar redo article from browser ${browser}`, async () => {

                        try {

                            // Aksi masuk ke dalam halaman browser
                            driver = await goToApp(browser, appHost);
                            await driver.manage().window().maximize();

                            // Aksi menunggu mengisi form login untuk melakukan authentication
                            await loginToApp(driver, user, browser, appHost);

                            // Aksi Sleep
                            await driver.sleep(3000);

                            // Aksi mengklik menu tab artikel
                            await driver.executeScript(`return document.querySelectorAll("ul.navbar-nav li.nav-item a a")[1].click()`);
                            
                            // Aksi Sleep
                            await driver.sleep(3000);

                            // Aksi klik tombol 'Tambah Artikel'
                            await driver.executeScript(`return document.querySelector('button#outline-button').click()`);
                            
                            // Aksi Sleep
                            await driver.sleep(3000);

                            // Aksi fill the form of article
                            let oldTextDescription = await driver.executeScript(`return document.querySelector('.editor__content .ProseMirror').innerHTML`);
                            let title = faker.lorem.words();
                            let description = faker.lorem.sentence();
                            await driver.sleep(1000);
                            await driver.findElement(By.css('textarea.title-inpt')).sendKeys(title);
                            await driver.executeScript(`return document.querySelector('.editor__content .ProseMirror p').textContent = "${description}"`);
                            // Aksi Sleep
                            await driver.sleep(3000);
                            let isAllFilled = await Promise.all([
                                await driver.findElement(By.css('textarea.title-inpt')).getAttribute('value'),
                                await driver.findElement(By.css('.editor__content .ProseMirror p')).getAttribute('innerText'),
                            ]).then(results => results.every(value => value != ''));
                            await thrownAnError('Input form create article is empty', !isAllFilled);
                            
                            // Aksi Sleep
                            await driver.sleep(3000);

                            if(isAllFilled) {

                                let clickable = await driver.findElement(By.css(".editor__content .ProseMirror"));
                                let action = await driver.actions({async: true});
                                await action.move({origin: await clickable}).press().perform();
                                await driver.sleep(2000);
                                await driver.executeScript(`return document.execCommand('selectAll', false, null);`);
                                // Aksi Sleep
                                await driver.sleep(3000);
                                oldTextDescription = await driver.executeScript(`return document.querySelector('.editor__content .ProseMirror').innerHTML`);
                                await driver.executeScript(`return document.querySelectorAll('.editor-control .menubar .menubar__button')[9].click()`);
                                await driver.sleep(2000);
                                await driver.executeScript(`return document.querySelectorAll('.editor-control .menubar .menubar__button')[10].click()`);
                                await driver.sleep(2000);
                                clickable = await driver.findElement(By.css(".editor__content .ProseMirror"));
                                action = await driver.actions({async: true});
                                await action.move({origin: await clickable}).press().perform();
                            }

                            // Aksi Sleep
                            await driver.sleep(3000);

                            // Expect results and add custom message for addtional description
                            let redoTextDescription = await driver.executeScript(`return document.querySelector('.editor__content .ProseMirror').innerHTML;`);
                            customMessages = [
                                await oldTextDescription === await redoTextDescription ? 'Successfully use redo of editor toolbar in description article' : 'Failed use redo of editor toolbar in description article'
                            ]
                            expect(await oldTextDescription === await redoTextDescription).to.equal(true);

                        } catch (error) {
                            expect.fail(error);
                        }

                    });
                    
                    it(`Reader - Check the details of article from browser ${browser}`, async () => {

                        try {

                            // Aksi masuk ke dalam halaman browser
                            driver = await goToApp(browser, appHost);
                            await driver.manage().window().maximize();

                            // Aksi menunggu mengisi form login untuk melakukan authentication
                            await loginToApp(driver, user, browser, appHost);

                            // Aksi Sleep
                            await driver.sleep(3000);

                            // Aksi mengklik menu tab artikel
                            await driver.executeScript(`return document.querySelectorAll("ul.navbar-nav li.nav-item a a")[1].click()`);
                            
                            // Aksi Sleep
                            await driver.sleep(3000);

                            // Aksi klik salah satu tombol selengkap nya dr article card
                            let articleCardLength = await driver.executeScript(`return document.querySelectorAll("#article-card-m p.action").length - 1`);
                            await thrownAnError('Article is empty', await articleCardLength === 0)
                            await driver.executeScript(`return document.querySelectorAll("#article-card-m p.action")[${faker.number.int({ min: 0, max: await articleCardLength })}].click()`);
                            
                            // Aksi Sleep
                            await driver.sleep(3000);
                            
                            // Expect results and add custom message for addtional description
                            let currentUrl = await driver.getCurrentUrl();
                            customMessages = [
                                currentUrl.includes('view?') ? 'Successfully directed to details article ✅' : 'Failed to find details article ❌'
                            ];
                            expect(currentUrl.includes('view?')).to.equal(true);

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