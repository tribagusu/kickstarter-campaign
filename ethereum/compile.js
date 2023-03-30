const path = require("path");
const solc = require("solc");
const fs = require("fs-extra");

// locate build folder
const buildPath = path.resolve(__dirname, "build");
// and delete everything inside
fs.removeSync(buildPath);

// locate campaign contract file
const campaignPath = path.resolve(__dirname, "contracts", "Campaign.sol");
// and read the content
const source = fs.readFileSync(campaignPath, "utf-8");
// and write the output of the compiled contract
const output = solc.compile(source, 1).contracts;

// recreate build folder
fs.ensureDirSync(buildPath);

// write the each contract output into json
for (let contract in output) {
  fs.outputJsonSync(
    path.resolve(buildPath, contract.replace(":", "") + ".json"),
    output[contract]
  );
}
