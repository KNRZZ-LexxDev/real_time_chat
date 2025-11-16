import React, { useState, useCallback } from 'react';
import { styled } from '@mui/material/styles';
import {
  Box,
  Drawer,
  useMediaQuery,
  useTheme
} from '@mui/material';
import Navbar from '../components/Layout/Navbar';
import ChannelList from '../components/Chat/ChannelList';
import ChatRoom from '../components/Chat/ChatRoom';

// ============ STYLED COMPONENTS ============
const PageContainer = styled(Box)({
  display: 'flex',
  flexDirection: 'column',
  height: '100vh',
  overflow: 'hidden',
});

const ContentContainer = styled(Box)({
  display: 'flex',
  flex: 1,
  overflow: 'hidden',
});

const MainContent = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'hide',
})(({ hide }) => ({
  flexGrow: 1,
  height: '100%',
  overflow: 'hidden',
  display: hide ? 'none' : 'block',
}));

// ============ MAIN COMPONENT ============
/**
 * Main chat page component
 * Manages layout and navigation between channels
 */
const ChatPage = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [selectedChannel, setSelectedChannel] = useState(null);
  const [showChannelList, setShowChannelList] = useState(!isMobile);
  const [channelListKey, setChannelListKey] = useState(0);

  const drawerWidth = 280;

  const handleSelectChannel = useCallback((channel) => {
    setSelectedChannel(channel);
    if (isMobile) {
      setShowChannelList(false);
    }
  }, [isMobile]);

  const handleBack = useCallback(() => {
    if (isMobile) {
      setShowChannelList(true);
    }
    setSelectedChannel(null);
    setChannelListKey(prev => prev + 1);
  }, [isMobile]);

  const handleChannelRemoved = useCallback((channelId) => {
    console.log('Channel removed:', channelId);
    
    if (selectedChannel?.id === channelId) {
      setSelectedChannel(null);
    }
    
    setChannelListKey(prev => prev + 1);
  }, [selectedChannel]);

  const handleChannelUpdate = useCallback(() => {
    setChannelListKey(prev => prev + 1);
  }, []);

  return (
    <PageContainer>
      <Navbar />
      <ContentContainer>
        {/* Channel list drawer */}
        {isMobile ? (
          <Drawer
            variant="temporary"
            open={showChannelList}
            onClose={() => setShowChannelList(false)}
            sx={{
              width: drawerWidth,
              '& .MuiDrawer-paper': { width: drawerWidth }
            }}
          >
            <ChannelList
              key={channelListKey}
              selectedChannel={selectedChannel}
              onSelectChannel={handleSelectChannel}
              onChannelUpdate={handleChannelUpdate}
            />
          </Drawer>
        ) : (
          <Drawer
            variant="permanent"
            sx={{
              width: drawerWidth,
              flexShrink: 0,
              '& .MuiDrawer-paper': {
                width: drawerWidth,
                boxSizing: 'border-box',
                position: 'relative'
              }
            }}
          >
            <ChannelList
              key={channelListKey}
              selectedChannel={selectedChannel}
              onSelectChannel={handleSelectChannel}
              onChannelUpdate={handleChannelUpdate}
            />
          </Drawer>
        )}

        {/* Chat room */}
        <MainContent hide={isMobile && showChannelList}>
          <ChatRoom 
            channel={selectedChannel} 
            onBack={handleBack}
            onChannelRemoved={handleChannelRemoved}
          />
        </MainContent>
      </ContentContainer>
    </PageContainer>
  );
};

export default ChatPage;
