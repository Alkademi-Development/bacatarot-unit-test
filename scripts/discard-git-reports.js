import clc from "cli-color";
import simpleGit from "simple-git";
import { rl } from '#root/commons/utils/inputUtils';
import { TEXT_CONFIRM } from '#root/commons/constants/input';

const git = simpleGit();

async function askRemoveFailedScreenshoots() {

    rl.question(clc.bold(clc.yellow("⚠  Apakah anda yakin ingin discard semua perubahan file reports ? (Y/t) ")), inputConfirm => {

        if(inputConfirm.trim().toLowerCase() === 't') {
            console.log(clc.bold(clc.green("\nOke, terimakasih telah mengkonfirmasi. Semua perubahan file report test tidak jadi di discard 👌\n")));
            rl.close();
        } else if(!TEXT_CONFIRM.includes(inputConfirm)) {
            console.log(clc.red('Input tidak valid, tolong masukkan sesuai instruksi'));
            askRemoveFailedScreenshoots();
        } else {
            let files = [];

            git.status((err, status) => {
                if (err) {
                  console.error('Terjadi kesalahan:', err);
                  return;
                }
              
                
                status.files.forEach(file => {
                    if(file.path.includes("testReports")) files.push(file.path);
                })
                
                if(files.length > 0) {
                    
                    async function discardChanges(files) {
                        try {
                          await git.clean('f', files);
                          console.log('Changes file test report failed discarded successfully.');
                          console.log(clc.bold(clc.green("Oke, terimakasih telah mengkonfirmasi semua perubahan file report hasil test telah berhasil di discard 👌\n")));
                        } catch (error) {
                          console.error('Error occurred while discarding changes:', error);
                        }
                    }
                    discardChanges(files);
    
                } else {
                    console.log(clc.bold(clc.red("\nMaaf, sepertinya perubahan file report test failed tidak di temukan 🤔\n")));
                }
    
                rl.close();
            });


        }

    });

}

askRemoveFailedScreenshoots()


