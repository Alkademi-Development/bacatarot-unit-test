import fs from "fs";
import path from "path";
import clc from "cli-color";
import simpleGit from "simple-git";
import { rl } from '#root/commons/utils/inputUtils';
import { TEXT_CONFIRM } from '#root/commons/constants/input';
import { execSync } from "child_process";

const git = simpleGit();

async function askRemoveFailedScreenshoots() {

    rl.question("Apakah anda yakin ingin discard semua perubahan file report yang gagal ? (Y/t) ", inputConfirm => {

        if(inputConfirm.trim().toLowerCase() === 't') {
            console.log(clc.bold(clc.green("\nOke, terimakasih telah mengkonfirmasi. Semua perubahan file report test yg gagal tidak jadi di discard 👌\n")));
            rl.close();
        } else if(!TEXT_CONFIRM.includes(inputConfirm)) {
            console.log(clc.red('Input tidak valid, tolong masukkan sesuai instruksi'));
            askRemoveFailedScreenshoots();
        } else {
            let files = [];

            const getFilesRecursively = (directory) => {
                const filesInDirectory = fs.readdirSync(directory);
                for (const file of filesInDirectory) {
                    const absolute = path.join(directory, file);
                    if (fs.statSync(absolute).isDirectory()) {
                        getFilesRecursively(absolute);
                    } else {
                        if(absolute.includes("fail")) files.push(absolute);
                    }
                }
            };
            
            getFilesRecursively(path.resolve('./testReports'));

            if(files.length > 0) {
                
                async function discardChanges(files) {
                    try {
                      await git.clean('f', files);
                      console.log('Changes file test report failed discarded successfully.');
                      console.log(clc.bold(clc.green("Oke, terimakasih telah mengkonfirmasi semua perubahan file report hasil test yang gagal telah berhasil di hapus 👌\n")));
                    } catch (error) {
                      console.error('Error occurred while discarding changes:', error);
                    }
                }
                discardChanges(files);

            } else {
                console.log(clc.bold(clc.red("\nMaaf, sepertinya perubahan file report test failed tidak di temukan 🤔\n")));
            }

            rl.close();

        }

    });

}

askRemoveFailedScreenshoots()


