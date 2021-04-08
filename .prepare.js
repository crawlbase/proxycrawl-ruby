// This is the package.json prepare script.
// It disables the execution on CI and also when is installed as dependency.
const { exec } = require('child_process');

if (undefined === process.env.NODE_ENV) {
  exec('husky install', (error, stdout) => {
    if (error) {
      // When the package is installed as a dependency, it also tries to install husky which fails. We ignore the error.
      if (error.message.indexOf(".git can't be found") > -1) {
        console.log('Skipping husky in the dependency.');
        return process.exit(0);
      }
      console.error(`prepare exec error: ${error}`);
      return process.exit(1);
    }
    console.log(stdout);
    return process.exit(0);
  });
}
