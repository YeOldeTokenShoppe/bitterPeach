"use client";
import { useEffect, useState } from "react";
import {
  ConnectButton,
  TransactionButton,
  useActiveAccount,
  useReadContract,
} from "thirdweb/react";
import { approve, balanceOf } from "thirdweb/extensions/erc20";
import {
  REWARD_TOKEN_CONTRACT,
  STAKE_TOKEN_CONTRACT,
  STAKING_CONTRACT,
} from "../../utilities/contracts";
import { prepareContractCall, toEther, toWei } from "thirdweb";
import { chain } from "../../utilities/chain";
import { client } from "../../utilities/client";

export const Stake = () => {
  const account = useActiveAccount();
  const [stakeAmount, setStakeAmount] = useState(0);
  const [withdrawAmount, setWithdrawAmount] = useState(0);
  const [stakingState, setStakingState] = useState("init");
  const [isStaking, setIsStaking] = useState(false);
  const [isWithdrawing, setIsWithdrawing] = useState(false);

  // Function declarations
  function truncate(value: string | number, decimalPlaces: number): number {
    const numericValue: number = Number(value);
    if (isNaN(numericValue)) {
      throw new Error("Invalid input: value must be convertible to a number.");
    }
    const factor: number = Math.pow(10, decimalPlaces);
    return Math.trunc(numericValue * factor) / factor;
  }

  // Contract reads
  const { data: stakeInfo, refetch: refetchStakeInfo } = useReadContract<
    any,
    any
  >({
    contract: STAKING_CONTRACT,
    method: "function getStakeInfo()",
    params: [account?.address as string],
    queryOptions: {
      enabled: !!account,
    },
  });

  const {
    data: stakingTokenBalance,
    isLoading: loadingStakeTokenBalance,
    refetch: refetchStakingTokenBalance,
  } = useReadContract(balanceOf, {
    contract: STAKE_TOKEN_CONTRACT,
    address: account?.address || "",
    queryOptions: {
      enabled: !!account,
    },
  });

  const {
    data: rewardTokenBalance,
    isLoading: loadingRewardTokenBalance,
    refetch: refetchRewardTokenBalance,
  } = useReadContract(balanceOf, {
    contract: REWARD_TOKEN_CONTRACT,
    address: account?.address || "",
    queryOptions: {
      enabled: !!account,
    },
  });

  const refetchData = () => {
    if (refetchStakeInfo) refetchStakeInfo();
    if (refetchStakingTokenBalance) refetchStakingTokenBalance();
    if (refetchRewardTokenBalance) refetchRewardTokenBalance();
  };

  useEffect(() => {
    const interval = setInterval(() => {
      refetchData();
    }, 10000);

    return () => clearInterval(interval);
  }, [refetchStakeInfo, refetchStakingTokenBalance, refetchRewardTokenBalance]);

  // Debug logs
  // useEffect(() => {
  //   console.log("Account:", account);
  //   console.log("Stake Info:", stakeInfo);
  //   console.log("Staking Token Balance:", stakingTokenBalance);
  //   console.log("Reward Token Balance:", rewardTokenBalance);
  // }, [account, stakeInfo, stakingTokenBalance, rewardTokenBalance]);

  return (
    <div>
      <div
        style={{
          backgroundColor: "#151515",
          padding: "40px",
          borderRadius: "10px",
        }}
      >
        <ConnectButton client={client} chain={chain} />

        {account && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-start",
              margin: "20px",
            }}
          >
            {loadingStakeTokenBalance ? (
              <p>Loading...</p>
            ) : (
              <p
                style={{
                  padding: "10px",
                  borderRadius: "5px",
                  marginRight: "5px",
                }}
              >
                Staking Token:{" "}
                {stakingTokenBalance
                  ? truncate(toEther(stakingTokenBalance), 2).toLocaleString()
                  : "0"}
              </p>
            )}
            {loadingRewardTokenBalance ? (
              <p>Loading...</p>
            ) : (
              <p
                style={{
                  padding: "10px",
                  borderRadius: "5px",
                }}
              >
                Reward Token:{" "}
                {rewardTokenBalance
                  ? truncate(toEther(rewardTokenBalance), 2).toLocaleString()
                  : "0"}
              </p>
            )}
          </div>
        )}

        {account && (
          <>
            <div>
              <button
                style={{
                  margin: "5px",
                  padding: "10px",
                  backgroundColor: "#efefef",
                  border: "none",
                  borderRadius: "6px",
                  color: "#333",
                  fontSize: "1rem",
                  width: "45%",
                  cursor: "pointer",
                }}
                onClick={() => setIsStaking(true)}
              >
                Stake
              </button>
              <button
                style={{
                  margin: "5px",
                  padding: "10px",
                  backgroundColor: "#efefef",
                  border: "none",
                  borderRadius: "6px",
                  color: "#333",
                  fontSize: "1rem",
                  width: "45%",
                  cursor: "pointer",
                }}
                onClick={() => setIsWithdrawing(true)}
              >
                Withdraw
              </button>
            </div>
            <div>
              <p>
                Balance Staked:{" "}
                {stakeInfo
                  ? truncate(
                      toEther(stakeInfo[0]).toString(),
                      2
                    ).toLocaleString()
                  : "0"}
              </p>
              <p>
                Reward Balance:{" "}
                {stakeInfo
                  ? truncate(
                      toEther(stakeInfo[1]).toString(),
                      2
                    ).toLocaleString()
                  : "0"}
              </p>
              <TransactionButton
                transaction={() =>
                  prepareContractCall({
                    contract: STAKING_CONTRACT,
                    method: "function claimRewards()",
                    params: [],
                  })
                }
                onTransactionConfirmed={() => {
                  refetchData();
                  refetchStakingTokenBalance();
                  refetchRewardTokenBalance();
                }}
              >
                Claim Rewards
              </TransactionButton>
            </div>
          </>
        )}
        {isStaking && (
          <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              backgroundColor: "rgba(0, 0, 0, 0.5)",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <div
              style={{
                position: "relative",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                backgroundColor: "#151515",
                padding: "40px",
                borderRadius: "10px",
                minWidth: "300px",
              }}
            >
              <button
                style={{
                  position: "absolute",
                  top: 5,
                  right: 5,
                  padding: "5px",
                  margin: "5px",
                  fontSize: "0.5rem",
                }}
                onClick={() => {
                  setIsStaking(false);
                  setStakeAmount(0);
                  setStakingState("init");
                }}
              >
                Close
              </button>
              <h3>Stake</h3>
              <p>Balance: {toEther(stakingTokenBalance!)}</p>
              {stakingState === "init" ? (
                <>
                  <input
                    type="number"
                    placeholder="0.0"
                    value={stakeAmount}
                    onChange={(e) => setStakeAmount(parseFloat(e.target.value))}
                    style={{
                      margin: "10px",
                      padding: "5px",
                      borderRadius: "5px",
                      border: "1px solid #333",
                      width: "100%",
                    }}
                  />
                  <TransactionButton
                    transaction={() =>
                      approve({
                        contract: STAKE_TOKEN_CONTRACT,
                        spender: STAKING_CONTRACT.address,
                        amount: stakeAmount,
                      })
                    }
                    onTransactionConfirmed={() => setStakingState("approved")}
                    style={{
                      width: "100%",
                      margin: "10px 0",
                    }}
                  >
                    Set Approval
                  </TransactionButton>
                </>
              ) : (
                <>
                  <h3 style={{ margin: "10px 0" }}>{stakeAmount}</h3>
                  <TransactionButton
                    transaction={() =>
                      prepareContractCall({
                        contract: STAKING_CONTRACT,
                        method: "function stake(uint256 amount)",
                        params: [toWei(stakeAmount.toString())],
                      })
                    }
                    onTransactionConfirmed={() => {
                      setStakeAmount(0);
                      setStakingState("init");
                      refetchData();
                      refetchStakingTokenBalance();
                      setIsStaking(false);
                    }}
                  >
                    Stake
                  </TransactionButton>
                </>
              )}
            </div>
          </div>
        )}
        {isWithdrawing && (
          <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              backgroundColor: "rgba(0, 0, 0, 0.5)",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <div
              style={{
                position: "relative",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                backgroundColor: "#151515",
                padding: "40px",
                borderRadius: "10px",
                minWidth: "300px",
              }}
            >
              <button
                style={{
                  position: "absolute",
                  top: 5,
                  right: 5,
                  padding: "5px",
                  margin: "5px",
                  fontSize: "0.5rem",
                }}
                onClick={() => {
                  setIsWithdrawing(false);
                }}
              >
                Close
              </button>
              <h3>Withdraw</h3>
              <input
                type="number"
                placeholder="0.0"
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(parseFloat(e.target.value))}
                style={{
                  margin: "10px",
                  padding: "5px",
                  borderRadius: "5px",
                  border: "1px solid #333",
                  width: "100%",
                }}
              />
              <TransactionButton
                transaction={() =>
                  prepareContractCall({
                    contract: STAKING_CONTRACT,
                    method: "function withdraw(uint256 amount)",
                    params: [toWei(withdrawAmount.toString())],
                  })
                }
                onTransactionConfirmed={() => {
                  setWithdrawAmount(0);
                  refetchData();
                  refetchStakingTokenBalance();
                  setIsWithdrawing(false);
                }}
                style={{
                  width: "100%",
                  margin: "10px 0",
                }}
              >
                Withdraw
              </TransactionButton>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
