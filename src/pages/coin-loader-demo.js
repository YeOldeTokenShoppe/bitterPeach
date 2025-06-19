import React, { useState } from "react";
import Head from "next/head";
import { Box, Heading, Button, Flex, Text, Switch, FormControl, FormLabel } from "@chakra-ui/react";
import CoinLoader from "../components/CoinLoader";

export default function CoinLoaderDemo() {
  const [loading, setLoading] = useState(false);
  const [showFullScreen, setShowFullScreen] = useState(false);

  const simulateLoading = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
    }, 3000);
  };

  const showFullScreenLoader = () => {
    setShowFullScreen(true);
    setTimeout(() => {
      setShowFullScreen(false);
    }, 5000);
  };

  return (
    <>
      <Head>
        <title>Coin Loader Demo</title>
      </Head>
      
      {showFullScreen && (
        <CoinLoader size="fullscreen" withSparkle={true} />
      )}
      
      <Box p={8} maxW="1200px" mx="auto">
        <Heading mb={8} textAlign="center">Coin Loader Component Demo</Heading>
        
        <Flex direction="column" gap={12}>
          {/* Full Screen Demo */}
          <Box textAlign="center" borderWidth={1} borderRadius="lg" p={6}>
            <Heading size="md" mb={4}>Full Screen Loader with Sparkle</Heading>
            <Text mb={4}>Click to see the loader centered on the page with sparkle effect</Text>
            <Button onClick={showFullScreenLoader} colorScheme="blue">
              Show Full Screen Loader (5 seconds)
            </Button>
          </Box>
          
          {/* Small Size Demo */}
          <Box textAlign="center">
            <Heading size="md" mb={4}>Small Size with Sparkle</Heading>
            <Box display="inline-block" position="relative">
              <CoinLoader size="small" withSparkle={true} />
            </Box>
          </Box>
          
          {/* Medium Size Demo */}
          <Box textAlign="center">
            <Heading size="md" mb={4}>Medium Size with Sparkle</Heading>
            <Box display="inline-block" position="relative">
              <CoinLoader size="medium" withSparkle={true} />
            </Box>
          </Box>
          
          {/* Large Size Demo */}
          <Box textAlign="center">
            <Heading size="md" mb={4}>Large Size with Sparkle</Heading>
            <Box display="inline-block" position="relative">
              <CoinLoader size="large" withSparkle={true} />
            </Box>
          </Box>
          
          {/* Without Sparkle Demo */}
          <Box textAlign="center">
            <Heading size="md" mb={4}>Without Sparkle Effect</Heading>
            <Box display="inline-block" position="relative">
              <CoinLoader size="medium" withSparkle={false} />
            </Box>
          </Box>
          
          {/* Without Text Demo */}
          <Box textAlign="center">
            <Heading size="md" mb={4}>Without Text</Heading>
            <Box display="inline-block" position="relative">
              <CoinLoader size="medium" showText={false} withSparkle={true} />
            </Box>
          </Box>
          
          {/* Simulated Loading Demo */}
          <Box textAlign="center">
            <Heading size="md" mb={4}>Simulated Loading State</Heading>
            <Button onClick={simulateLoading} mb={4} isDisabled={loading}>
              {loading ? "Loading..." : "Click to Load"}
            </Button>
            {loading ? (
              <Box display="inline-block" position="relative">
                <CoinLoader size="medium" withSparkle={true} />
              </Box>
            ) : (
              <Text>Content loaded!</Text>
            )}
          </Box>
        </Flex>
      </Box>
    </>
  );
}