const assert = require("assert");
const ganache = require("ganache");
const Web3 = require("web3");
const web3 = new Web3(ganache.provider());

const compiledFactory = require("../ethereum/build/CampaignFactory.json");
const compiledCampaign = require("../ethereum/build/Campaign.json");

let accounts;
let factory;
let campaign;
let campaignAddress;

beforeEach(async () => {
  // get account from ganache
  accounts = await web3.eth.getAccounts();

  // deploy the contract
  factory = await new web3.eth.Contract(JSON.parse(compiledFactory.interface))
    .deploy({ data: compiledFactory.bytecode })
    .send({ from: accounts[0], gas: "1000000" });

  await factory.methods
    .createCampaign("100")
    .send({ from: accounts[0], gas: "1000000" });

  // get the first element of array and assign to the campaignAddress variable
  // this destructuring method wont replace the entire array, but will insert a single element
  [campaignAddress] = await factory.methods.getDeployedCampaigns().call();
  // deploy the campaign
  campaign = await new web3.eth.Contract(
    JSON.parse(compiledCampaign.interface),
    campaignAddress
  );
});

describe("Campaigns", () => {
  it("deploys a factory and a campaign", () => {
    // if the contract successfully deployed, they will have an address
    assert.ok(factory.options.address);
    assert.ok(campaign.options.address);
  });

  it("marks caller as the campaign manager", async () => {
    // retrieve the address of the manager
    const manager = await campaign.methods.manager().call();

    // compare with the caller address
    assert.equal(accounts[0], manager);
  });

  it("allows people to contribute money and marks them as approvers", async () => {
    // call the contribute function
    await campaign.methods.contribute().send({
      value: "200",
      from: accounts[1],
    });

    // check if the accounts that call the contribute function is exist inside the mapping.
    const isContributor = await campaign.methods.approvers(accounts[1]).call();

    // check if isContributor is true
    assert(isContributor);
  });

  it("requires a minimum contribution", async () => {
    try {
      await campaign.methods.contribute().send({
        value: "5",
        from: accounts[1],
      });
      assert(false);
    } catch (err) {
      assert(err);
    }
  });

  it("allows a manager to make a payment request", async () => {
    await campaign.methods
      .createRequest("Buy batteries", "100", accounts[1])
      .send({
        from: accounts[0],
        gas: "1000000",
      });
    const request = await campaign.methods.requests(0).call();

    // check if the request is already made
    assert.equal("Buy batteries", request.description);
    // or you can do with another
    assert.equal("100", request.value);
  });
});
