import { useEffect, useState } from "react";
import { ethers } from "ethers";
import abi from "./lib/lotteryAbi.json";
import {
  Typography,
  Button,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemText,
  Divider,
  Alert,
  CircularProgress,
  Box,
  Stack,
} from "@mui/material";
import CasinoIcon from "@mui/icons-material/Casino";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import PeopleIcon from "@mui/icons-material/People";
import AlarmIcon from "@mui/icons-material/Alarm";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";

const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS as string;

function App() {
  const [contract, setContract] = useState<ethers.Contract>();
  const [players, setPlayers] = useState<string[]>([]);
  const [lastWinner, setLastWinner] = useState<string | null>(null);
  const [lastPrize, setLastPrize] = useState("0");
  const [nextRun, setNextRun] = useState<Date>();
  const [balance, setBalance] = useState("0");
  const [loading, setLoading] = useState(false);
  const [isDrawInProgress, setIsDrawInProgress] = useState(false);
  const [prevWinner, setPrevWinner] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!window.ethereum) return alert("Please install MetaMask");

      const provider = new ethers.providers.Web3Provider(window.ethereum);
      await provider.send("eth_requestAccounts", []);
      const signer = provider.getSigner();

      const contract = new ethers.Contract(CONTRACT_ADDRESS, abi, signer);
      setContract(contract);

      const now = new Date();
      const nextDraw = getNextDrawTime(now);
      setNextRun(nextDraw);

      const bal = await provider.getBalance(CONTRACT_ADDRESS);
      setBalance(ethers.utils.formatEther(bal));

      const playersList = await contract.getPlayers();
      setPlayers(playersList);

      const lastWinnerAddr = await contract.lastWinner();
      const prize = await contract.lastPrize();
      setLastWinner(lastWinnerAddr);
      setLastPrize(ethers.utils.formatEther(prize));
    };

    load();
  }, []);

  useEffect(() => {
    const interval = setInterval(async () => {
      if (!contract) return;

      // Refresh players and balance
      try {
        const updatedPlayers = await contract.getPlayers();
        setPlayers(updatedPlayers);

        const updatedBalance = await contract.provider.getBalance(
          CONTRACT_ADDRESS
        );
        setBalance(ethers.utils.formatEther(updatedBalance));
      } catch (err) {
        console.error("Auto-refresh failed:", err);
      }
    }, 1000); // Refresh every second

    return () => clearInterval(interval);
  }, [contract]);

  useEffect(() => {
    const interval = setInterval(async () => {
      if (!contract) return;

      const now = new Date();

      if (nextRun && now >= nextRun) {
        if (players.length > 0 && !isDrawInProgress) {
          setIsDrawInProgress(true);
          setPrevWinner(lastWinner);
        }
      }

      if (isDrawInProgress) {
        try {
          const updatedPlayers = await contract.getPlayers();
          const updatedWinner = await contract.lastWinner();

          if (
            updatedPlayers.length === 0 ||
            (prevWinner && updatedWinner && updatedWinner !== prevWinner)
          ) {
            setIsDrawInProgress(false);
            setPlayers(updatedPlayers);
            setLastWinner(updatedWinner);

            const updatedBalance = await contract.provider.getBalance(
              CONTRACT_ADDRESS
            );
            setBalance(ethers.utils.formatEther(updatedBalance));

            const prize = await contract.lastPrize();
            setLastPrize(ethers.utils.formatEther(prize));

            const now = new Date();
            const nextDraw = getNextDrawTime(now);
            setNextRun(nextDraw);
          }
        } catch (error) {
          console.error("Polling error:", error);
        }
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [contract, nextRun, isDrawInProgress, players, lastWinner, prevWinner]);

  const getNextDrawTime = (currentTime: Date): Date => {
    const minutes = currentTime.getMinutes();
    const nextMinute = [0, 15, 30, 45].find((m) => m > minutes) ?? 0;
    const nextHour =
      nextMinute === 0 && minutes > 45
        ? currentTime.getHours() + 1
        : currentTime.getHours();

    currentTime.setMinutes(nextMinute);
    currentTime.setSeconds(0);
    currentTime.setMilliseconds(0);
    if (nextMinute === 0 && minutes > 45) currentTime.setHours(nextHour);
    return new Date(currentTime);
  };

  const joinLottery = async () => {
    if (!contract) return;

    setLoading(true);

    try {
      const tx = await contract.enterLottery({
        value: ethers.utils.parseEther("0.01"),
      });
      await tx.wait();
      alert("Entered lottery!");

      const playersList = await contract.getPlayers();
      setPlayers(playersList);

      const bal = await contract.provider.getBalance(CONTRACT_ADDRESS);
      setBalance(ethers.utils.formatEther(bal));
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const groupPlayers = () => {
    const grouped: { [key: string]: number } = {};
    players.forEach((player) => {
      grouped[player] = (grouped[player] || 0) + 1;
    });
    return grouped;
  };

  const totalEntries = Object.values(groupPlayers()).reduce(
    (acc, count) => acc + count,
    0
  );

  const calculateProbability = (entries: number) => {
    return totalEntries === 0
      ? "0.00"
      : ((entries / totalEntries) * 100).toFixed(2);
  };

  const isJoinDisabled =
    (nextRun && new Date() >= nextRun) || isDrawInProgress || loading;

  return (
    <Box
      sx={{
        height: "100vh",
        width: "100vw",
        bgcolor: "#000", // Black background
        color: "#000", // Dark text for white cards
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        px: 2,
      }}
    >
      <Box
        sx={{
          width: "100%",
          maxWidth: 600,
        }}
      >
        <Typography
          variant="h4"
          fontWeight="bold"
          gutterBottom
          align="center"
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#fff",
          }}
        >
          <CasinoIcon sx={{ mr: 1 }} />
          Decentralised Lottery
        </Typography>

        <Stack direction="column" spacing={3} sx={{ mb: 4 }}>
          <Card>
            <CardContent>
              <Typography
                variant="h6"
                sx={{ display: "flex", alignItems: "center" }}
              >
                <AlarmIcon sx={{ mr: 1 }} />
                Next Draw
              </Typography>
              <Typography>
                {nextRun?.toLocaleTimeString() ?? "Calculating..."}
              </Typography>
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <Typography
                variant="h6"
                sx={{ display: "flex", alignItems: "center" }}
              >
                <AccountBalanceWalletIcon sx={{ mr: 1 }} />
                Prize Pool
              </Typography>
              <Typography>{balance} ETH</Typography>
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <Typography
                variant="h6"
                sx={{ display: "flex", alignItems: "center" }}
              >
                <EmojiEventsIcon sx={{ mr: 1 }} />
                Last Winner
              </Typography>
              <Typography variant="body2" sx={{ wordBreak: "break-word" }}>
                {lastWinner ?? "N/A"}
              </Typography>
              <Typography>won {lastPrize} ETH</Typography>
            </CardContent>
          </Card>
        </Stack>

        {isDrawInProgress ? (
          <Box textAlign="center" mb={4}>
            <CircularProgress size={24} sx={{ mb: 1 }} />
            <Typography sx={{ color: "#fff" }}>
              Drawing for {nextRun?.toLocaleTimeString()}
            </Typography>
          </Box>
        ) : (
          <Button
            onClick={joinLottery}
            variant="contained"
            color="primary"
            fullWidth
            sx={{ mb: 4 }}
            disabled={isJoinDisabled}
          >
            {loading ? (
              <CircularProgress size={24} />
            ) : (
              "🎟️ Join Lottery (0.01 ETH)"
            )}
          </Button>
        )}

        <Card>
          <CardContent>
            <Typography
              variant="h6"
              sx={{ display: "flex", alignItems: "center" }}
            >
              <PeopleIcon sx={{ mr: 1 }} />
              Players ({players.length})
            </Typography>

            {Object.keys(groupPlayers()).length === 0 ? (
              <Alert severity="info" sx={{ mt: 2 }}>
                No players yet.
              </Alert>
            ) : (
              <List>
                {Object.entries(groupPlayers()).map(([addr, count], i) => (
                  <div key={i}>
                    <ListItem>
                      <ListItemText
                        primary={addr}
                        secondary={`Entries: ${count} | Chance: ${calculateProbability(
                          count
                        )}%`}
                      />
                    </ListItem>
                    {i < players.length - 1 && <Divider />}
                  </div>
                ))}
              </List>
            )}
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
}

export default App;
