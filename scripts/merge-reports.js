import fs from 'fs';
import clc from "cli-color";
import { merge } from 'mochawesome-merge';
import { create } from 'mochawesome-report-generator';
import { rl } from '#root/commons/utils/inputUtils';
import { TEXT_REPORTS, TEXT_CONFIRM } from '#root/commons/constants/input';
import moment from 'moment-timezone';
  
function getJsonFiles(directory) {
    return new Promise((resolve, reject) => {
      const jsonFiles = [];
  
      function traverseDir(dir) {
        const files = fs.readdirSync(dir);
  
        files.forEach((file) => {
          const filePath = `${dir}/${file}`;
  
          if (fs.statSync(filePath).isDirectory()) {
            traverseDir(filePath);
          } else if (file.endsWith('.json')) {
            jsonFiles.push(filePath);
          }
        });
      }
  
      try {
        traverseDir(directory);
        resolve(jsonFiles);
      } catch (error) {
        reject(error);
      }
    });
}

function askMergeReport() {
  
  rl.question(clc.bold("Pilih salah satu jenis tipe test yang anda ingin merge 'app' atau 'api' : "), async input => {

      if(!TEXT_REPORTS.includes(input)) {
        console.log(clc.red('Input tidak valid, tolong masukkan sesuai instruksi'));
        askMergeReport();
      } else if(input.trim().toLowerCase() === 'app') {
        
        const directory = './testResults/reports/app';
        
        let files = await getJsonFiles(directory);

        if(files.length > 0) {

          function askQuestion() {
            rl.question(`Apakah anda ingin merge semua hasil report termasuk yang gagal atau yang berhasil saja? (Y/t) `, async inputConfirm => {
              
              if(!TEXT_CONFIRM.includes(inputConfirm)) {
                console.log(clc.yellow(`Maaf, input tidak valid. Tolong masukkan sesuai instruksi`));
                askQuestion();
              } else if(inputConfirm.trim().toLowerCase() === 'y') {
                const reports = await merge({ files });
                const outputFile = `./testResults/output-merged-report-${input}.json`;  
                
                fs.writeFileSync(outputFile, JSON.stringify(reports, null, 2));
                
                if(fs.existsSync(outputFile)) {
                  const reportData = fs.readFileSync(outputFile, 'utf-8');
          
                  const options = { 
                      reportPageTitle: `Report Testing ${input} ${moment().tz('Asia/Jakarta').format('MM-DD-YYYY')}`,
                      reportDir: './testResults', // Path folder untuk menyimpan report
                      reportFilename: `${moment().tz('Asia/Jakarta').format('MM-DD-YYYY')}-merged-report-${input}.html`, // Nama file report
                      assetsDir: './testResults/assets', // Path folder untuk menyimpan assets
                  };
                  await create(JSON.parse(reportData), options);
                  console.log(clc.green(`Merged reports successfully generated in './testResults/output-merged-report-${input}.html' 😊`))
                  rl.close();
                }
              } else {
                files = files.filter(file => !file.trim().toLowerCase().includes('failed'));
  
                const reports = await merge({ files });
                const outputFile = `./testResults/output-merged-report-${input}.json`;  
                  
                fs.writeFileSync(outputFile, JSON.stringify(reports, null, 2));
                
                if(fs.existsSync(outputFile)) {
                  const reportData = fs.readFileSync(outputFile, 'utf-8');
          
                  const options = { 
                      reportPageTitle: `Report Testing ${input} ${moment().tz('Asia/Jakarta').format('MM-DD-YYYY')}`,
                      reportDir: './testResults', // Path folder untuk menyimpan report
                      reportFilename: `${moment().tz('Asia/Jakarta').format('MM-DD-YYYY')}-merged-report-${input}.html`, // Nama file report
                      assetsDir: './testResults/assets', // Path folder untuk menyimpan assets
                  };
                  await create(JSON.parse(reportData), options);
                  console.log(clc.green(`Merged reports successfully generated in './testResults/output-merged-report-${input}.html' 😊`));
                  rl.close();
                } 
              }
  
            })
          }

          askQuestion();

        } else {
          console.log(`No reports saved to ${directory} 😢`);
          rl.close();
        }
      } else if (input.trim().toLowerCase() === 'api') {

        const directory = './testResults/reports/api';
        
        let files = await getJsonFiles(directory);

        if(files.length > 0) {
          
          function askQuestion() {
            rl.question(`Apakah anda ingin merge semua hasil report termasuk yang gagal atau yang berhasil saja? (Y/t) `, async inputConfirm => {
              
              if(!TEXT_CONFIRM.includes(inputConfirm)) {
                console.log(clc.yellow(`Maaf, input tidak valid. Tolong masukkan sesuai instruksi`));
                askQuestion();
              } else if(inputConfirm.trim().toLowerCase() === 'y') {
                const reports = await merge({ files });
                  
                fs.writeFileSync(outputFile, JSON.stringify(reports, null, 2));
                
                if(fs.existsSync(`./testResults/output-merged-report-${input}.json`)) {
                  const reportData = fs.readFileSync(`./testResults/output-merged-report-${input}.json`, 'utf-8');
          
                  const options = { 
                      reportPageTitle: `Report Testing ${input} ${moment().tz('Asia/Jakarta').format('MM-DD-YYYY')}`,
                      reportDir: './testResults', // Path folder untuk menyimpan report
                      reportFilename: `merged-report-${input}.html`, // Nama file report
                      assetsDir: './testResults/assets', // Path folder untuk menyimpan assets
                  };
                  await create(JSON.parse(reportData), options);
                  console.log(clc.green(`Merged reports successfully generated in './testResults/output-merged-report-${input}.html' 😊`))
                  rl.close();
                } 
              } else {
                files = files.filter(file => !file.trim().toLowerCase().includes('failed'));
  
                const reports = await merge({ files });
                  
                fs.writeFileSync(outputFile, JSON.stringify(reports, null, 2));
                
                if(fs.existsSync(`./testResults/output-merged-report-${input}.json`)) {
                  const reportData = fs.readFileSync(`./testResults/output-merged-report-${input}.json`, 'utf-8');
          
                  const options = { 
                      reportPageTitle: `Report Testing ${input} ${moment().tz('Asia/Jakarta').format('MM-DD-YYYY')}`,
                      reportDir: './testResults', // Path folder untuk menyimpan report
                      reportFilename: `merged-report-${input}.html`, // Nama file report
                      assetsDir: './testResults/assets', // Path folder untuk menyimpan assets
                  };
                  await create(JSON.parse(reportData), options);
                  console.log(clc.green(`Merged reports successfully generated in './testResults/output-merged-report-${input}.html' 😊`))
                  rl.close();
                } 
              }
  
            })
          }
          askQuestion();
        } else {
          console.log(`No reports saved to ${directory} 😢`);
          rl.close()
        }
      } else {
        console.log(clc.red('Input tidak valid, tolong masukkan sesuai instruksi'));
        askMergeReport();
      }

  })

}

askMergeReport();


  