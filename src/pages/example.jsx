import React from "react";
import PageContainer from "../components/PageContainer";
import { Box, Heading, Text, Button, Flex, Divider } from "@chakra-ui/react";

const ExamplePage = () => {
  return (
    <>
      {/* Default container with max-width of 1400px */}
      <PageContainer>
        <Box
          width="100%"
          p={4}
          mb={8}
          bg="purple.800"
          color="white"
          borderRadius="md"
        >
          <Heading as="h1" size="xl" mb={4}>
            Default Container
          </Heading>
          <Text mb={4}>
            This container uses the default max-width of 1400px with responsive
            margins. This provides a good balance between readability and screen
            utilization without making content too wide.
          </Text>
          <Button colorScheme="purple" variant="outline">
            Learn More
          </Button>
        </Box>
      </PageContainer>

      <Divider my={8} />

      {/* Custom width container */}
      <PageContainer maxWidth="1200px">
        <Box
          width="100%"
          p={4}
          mb={8}
          bg="blue.800"
          color="white"
          borderRadius="md"
        >
          <Heading as="h1" size="xl" mb={4}>
            Narrower Container (1200px)
          </Heading>
          <Text mb={4}>
            This container uses a custom max-width of 1200px, which is more
            focused and better for text-heavy content. It's similar to your
            original width constraint.
          </Text>
          <Button colorScheme="blue" variant="outline">
            Learn More
          </Button>
        </Box>
      </PageContainer>

      <Divider my={8} />

      {/* Full width container */}
      <PageContainer fullWidth>
        <Box
          width="100%"
          p={4}
          mb={8}
          bg="green.800"
          color="white"
          borderRadius="md"
        >
          <Heading as="h1" size="xl" mb={4}>
            Full Width Container
          </Heading>
          <Text mb={4}>
            This container uses the full width of the viewport, which is great
            for immersive content like galleries, hero sections, or data
            visualizations.
          </Text>
          <Button colorScheme="green" variant="outline">
            Learn More
          </Button>
        </Box>
      </PageContainer>

      <Divider my={8} />

      {/* Width comparison */}
      <PageContainer>
        <Box
          width="100%"
          p={4}
          bg="gray.800"
          color="white"
          borderRadius="md"
          mb={4}
        >
          <Heading as="h2" size="lg" mb={4}>
            Width Adjustment
          </Heading>
          <Text>
            We adjusted the maximum width from 1800px to 1400px to prevent
            content from appearing too stretched out on larger screens, while
            still providing more space than the original 1200px constraint.
          </Text>
        </Box>

        <Flex width="100%" direction={{ base: "column", md: "row" }} gap={4}>
          <Box flex="1" p={4} bg="red.800" color="white" borderRadius="md">
            <Heading as="h2" size="lg" mb={4}>
              Responsive Layout
            </Heading>
            <Text>
              This demonstrates how the container adapts to different screen
              sizes while maintaining appropriate margins and readability.
            </Text>
          </Box>
          <Box flex="1" p={4} bg="orange.800" color="white" borderRadius="md">
            <Heading as="h2" size="lg" mb={4}>
              Content Width
            </Heading>
            <Text>
              With the adjusted container system, your content has more space on
              larger displays while still maintaining a clean, readable layout
              without excessive width.
            </Text>
          </Box>
        </Flex>
      </PageContainer>
    </>
  );
};

export default ExamplePage;
