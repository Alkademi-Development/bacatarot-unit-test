import clc from "cli-color";

const ALL_TEXT_INPUT = {
    questionInputReportFile: `2. Apakah anda ingin membuat file laporan / report testnya terpisah ?, \n jika iya masukkan nama report (formatnya ${clc.yellow("'tester'")} atau ${clc.yellow("'tester-file'")} atau jika anda ingin menaruh nya di dalam folder bisa seperti ini ${clc.yellow("'folder/tester-file'")} ) : `,
};

const TEXT_CONFIRM = ['y', 't'];

export {
    ALL_TEXT_INPUT,
    TEXT_CONFIRM
}

