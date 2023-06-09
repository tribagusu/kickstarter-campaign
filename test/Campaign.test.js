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
  factory = await new web3.eth.Contract(compiledFactory.abi)
    .deploy({ data: compiledFactory.evm.bytecode.object })
    .send({ from: accounts[0], gas: "1400000" });

  await factory.methods
    .createCampaign("100")
    .send({ from: accounts[0], gas: "1400000" });

  // get the first element of array and assign to the campaignAddress variable
  // this destructuring method wont replace the entire array, but will insert a single element
  [campaignAddress] = await factory.methods.getDeployedCampaigns().call();
  // deploy the campaign
  campaign = await new web3.eth.Contract(compiledCampaign.abi, campaignAddress);
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
        gas: "1400000",
      });
    const request = await campaign.methods.requests(0).call();

    // check if the request is already made
    assert.equal("Buy batteries", request.description);
    // or you can do with another
    assert.equal("100", request.value);
  });

  it("processes requests", async () => {
    // create minimum 1 contribution
    await campaign.methods.contribute().send({
      from: accounts[0],
      value: web3.utils.toWei("10", "ether"),
    });

    // creator of the campaign create a request
    await campaign.methods
      .createRequest("A", web3.utils.toWei("5", "ether"), accounts[1])
      .send({
        from: accounts[0],
        gas: "1400000",
      });

    // contributor approve the request
    await campaign.methods.approveRequest(0).send({
      from: accounts[0],
      gas: "1400000",
    });

    // creator of the campaign finalize the request that has been approved
    await campaign.methods.finalizeRequest(0).send({
      from: accounts[0],
      gas: "1400000",
    });

    // get the balance from account 1 as the creator
    let balance = await web3.eth.getBalance(accounts[1]);
    // change the balance into ether
    balance = web3.utils.fromWei(balance, "ether");
    // turn into decimal to make comparison possible
    balance = parseFloat(balance);

    console.log(balance);
    assert(balance > 104);
  });
});
