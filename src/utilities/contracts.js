import { getContract } from "thirdweb";
import { chain } from "./chain";
import { client } from "./client";
import { STAKING_CONTRACT_ABI } from "../utilities/stakingContractABI";

const stakeTokenContractAddress = "0x1D0AE877913917eE3a3e8585D658E9e4dC545c83";

const rewardTokenContractAddress = "0xCE787f5D720c9486e711e8212A0c4750F2fBD3Ba";
const stakingContractAddress = "0xA88C03147fB28BBB354a19eBA347a0bE34Db9220";

export const STAKE_TOKEN_CONTRACT = getContract({
  client: client,
  chain: chain,
  address: stakeTokenContractAddress,
});

export const REWARD_TOKEN_CONTRACT = getContract({
  client: client,
  chain: chain,
  address: rewardTokenContractAddress,
});

export const STAKING_CONTRACT = getContract({
  client: client,
  chain: chain,
  address: stakingContractAddress,
  abi: STAKING_CONTRACT_ABI,
});
