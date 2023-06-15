import fs from "fs";
import path from "path";
import clc from "cli-color";
import { rl } from '#root/commons/utils/inputUtils';
import { TEXT_CONFIRM } from '#root/commons/constants/input';



async function askRemoveFailedScreenshoots() {

    rl.question("Apakah anda yakin ingin menghapus semua file report yang gagal ? (Y/t) ", inputConfirm => {

        if(inputConfirm.trim().toLowerCase() === 't') {
            console.log(clc.bold(clc.green("\nOke, terimakasih telah mengkonfirmasi file reports test yg gagal tidak jadi di hapus 👌\n")));
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
                        if(absolute.includes("[failed]")) files.push(absolute);
                    }
                }
            };
            
            getFilesRecursively(path.resolve('./testReports'))

            if(files.length > 0) {
                files.forEach(filePath => {
                    fs.unlinkSync(filePath);
                })
                console.log(clc.bold(clc.green("\nOke, terimakasih telah mengkonfirmasi semua file reports hasil test yang gagal telah berhasil di hapus 👌\n")));
            } else {
                console.log(clc.bold(clc.red("\nMaaf, sepertinya file test failed tidak di temukan 🤔\n")));
            }

            rl.close();

        }

    });

}

askRemoveFailedScreenshoots()


