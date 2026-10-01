process.env.CSC_IDENTITY_AUTO_DISCOVERY='false';
const fs=require('node:fs'),path=require('node:path');
// Support the bundled Node runtime when npm is not installed globally.
const localNpm=path.resolve('.tools/package/bin/npm-cli.js');
if(fs.existsSync(localNpm)){
  fs.writeFileSync('.tools/npm.cmd',`@"${process.execPath}" "${localNpm}" %*\r\n`);
  process.env.PATH=path.resolve('.tools')+path.delimiter+process.env.PATH;
}
require('electron-builder').build({dir:true,config:{directories:{output:'release',buildResources:'assets'},win:{signExecutable:false}}}).catch(error=>{console.error(error);process.exitCode=1;});
