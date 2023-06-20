import { Builder, By, Key, until } from 'selenium-webdriver';
import { captureConsoleErrors } from '#root/commons/utils/generalUtils';
import { captureAlertError } from '#root/commons/utils/generalUtils';

const goToApp = async (browser, appHost) => {

    let driver = new Builder()
        .forBrowser(browser)
        .build();
    
    try {
        await driver.get(appHost);
    } catch (error) {
        await driver.sleep(3000);
        await driver.quit();
    }

    return driver;

}


const loginToApp = async (driver, user, browser, appHost) => {

    // Aksi klik masuk untuk menuju ke halaman login/authentication
    const modalPermission = await driver.findElements(By.id("modal-permission"));
    if(await modalPermission.length > 0) {
        await driver.wait(until.elementLocated(By.id('modal-permission')));              
        await driver.findElement(By.css("#modal-permission .modal-content header button.close")).click();
    }

    // Aksi mengklik button login 
    await driver.findElement(By.css("button.btn-login")).click();

    // Aksi menunggu halaman authentication
    await driver.wait(until.elementLocated(By.id("auth")));

    // Aksi Input Data Akun 
    await driver.wait(until.elementLocated(By.css(`input#email`)));
    await driver.findElement(By.css(`input#email`)).sendKeys(user.email, Key.RETURN);
    await driver.findElement(By.css(`input#password`)).sendKeys(user.password, Key.RETURN);
    
    // Aksi menunggu header active user
    await driver.wait(until.elementLocated(By.css("div.active-user")));
    
}

export {
    goToApp,
    loginToApp,
}