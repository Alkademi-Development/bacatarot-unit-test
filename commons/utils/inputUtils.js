import readline from 'readline';
import { environment } from '#root/api/app-token';

export const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const getCustomOptionReportFile = (inputReportFile) => {
  return inputReportFile ? `--reporter-options code=false,cdn=true,charts=true,reportDir=testResults/reports,reportFilename=${inputReportFile.replace(/\s/g, '').toLowerCase()}/[status]-index-report,reportPageTitle=Laporan-Harian-Testing` : `--reporter-options code=false,overwrite=false,reportDir=testResults/reports,reportFilename=examples/test-results,reportPageTitle=Laporan-Harian-Testing`;
}

export {
  getCustomOptionReportFile
}