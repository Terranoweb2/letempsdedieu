import React, { useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../theme/colors';
import { Conversation } from '../screens/ChatScreen';

interface SwipeableConversationProps {
  conversation: Conversation;
  isActive: boolean;
  isPinned: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onTogglePin: () => void;
  onShare?: () => void;
}

const SwipeableConversation: React.FC<SwipeableConversationProps> = ({
  conversation,
  isActive,
  isPinned,
  onSelect,
  onDelete,
  onTogglePin,
  onShare,
}) => {
  const swipeableRef = useRef<Swipeable>(null);

  const renderRightActions = (
    progress: Animated.AnimatedInterpolation<number>,
    dragX: Animated.AnimatedInterpolation<number>
  ) => {
    const translateX = dragX.interpolate({
      inputRange: [-160, 0],
      outputRange: [0, 160],
      extrapolate: 'clamp',
    });

    return (
      <Animated.View
        style={[styles.rightActionsContainer, { transform: [{ translateX }] }]}
      >
        {onShare && (
          <TouchableOpacity
            style={styles.shareActionInner}
            onPress={() => {
              swipeableRef.current?.close();
              onShare();
            }}
          >
            <Ionicons name="share-outline" size={18} color={Colors.white} />
            <Text style={styles.actionText}>Partager</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={styles.deleteActionInner}
          onPress={() => {
            swipeableRef.current?.close();
            onDelete();
          }}
        >
          <Ionicons name="trash-outline" size={18} color={Colors.white} />
          <Text style={styles.actionText}>Supprimer</Text>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  const renderLeftActions = (
    progress: Animated.AnimatedInterpolation<number>,
    dragX: Animated.AnimatedInterpolation<number>
  ) => {
    const translateX = dragX.interpolate({
      inputRange: [0, 80],
      outputRange: [-80, 0],
      extrapolate: 'clamp',
    });

    return (
      <Animated.View
        style={[styles.pinAction, { transform: [{ translateX }] }]}
      >
        <TouchableOpacity
          style={styles.pinActionInner}
          onPress={() => {
            swipeableRef.current?.close();
            onTogglePin();
          }}
        >
          <Ionicons name="pin" size={18} color={Colors.white} />
          <Text style={styles.actionText}>
            {isPinned ? 'Desepingler' : 'Epingler'}
          </Text>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  return (
    <Swipeable
      ref={swipeableRef}
      renderRightActions={renderRightActions}
      renderLeftActions={renderLeftActions}
      overshootRight={false}
      overshootLeft={false}
      friction={2}
    >
      <TouchableOpacity
        style={[
          styles.conversationItem,
          isActive && styles.conversationItemActive,
        ]}
        onPress={onSelect}
        activeOpacity={0.7}
      >
        <Ionicons
          name="chatbubble-outline"
          size={18}
          color={isActive ? Colors.teal500 : Colors.gray500}
        />
        <Text
          style={[
            styles.conversationTitle,
            isActive && styles.conversationTitleActive,
          ]}
          numberOfLines={1}
        >
          {conversation.title}
        </Text>
        {isPinned && (
          <Ionicons name="pin" size={14} color={Colors.gold500} />
        )}
      </TouchableOpacity>
    </Swipeable>
  );
};

const styles = StyleSheet.create({
  conversationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 11,
    paddingHorizontal: 14,
    marginHorizontal: 8,
    marginVertical: 2,
    borderRadius: 10,
    gap: 10,
    backgroundColor: Colors.navy950,
  },
  conversationItemActive: {
    backgroundColor: Colors.whiteBorder10,
  },
  conversationTitle: {
    flex: 1,
    color: Colors.gray400,
    fontSize: 14,
    fontWeight: '500',
  },
  conversationTitleActive: {
    color: Colors.white,
  },
  rightActionsContainer: {
    flexDirection: 'row',
    width: 160,
    marginVertical: 2,
    marginRight: 8,
  },
  shareActionInner: {
    width: 80,
    backgroundColor: Colors.teal600,
    justifyContent: 'center',
    alignItems: 'center',
    borderTopLeftRadius: 10,
    borderBottomLeftRadius: 10,
  },
  deleteActionInner: {
    width: 80,
    backgroundColor: '#dc2626',
    justifyContent: 'center',
    alignItems: 'center',
    borderTopRightRadius: 10,
    borderBottomRightRadius: 10,
  },
  pinAction: {
    width: 80,
    backgroundColor: Colors.teal700,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 10,
    marginVertical: 2,
    marginLeft: 8,
  },
  pinActionInner: {
    justifyContent: 'center',
    alignItems: 'center',
    flex: 1,
    width: '100%',
  },
  actionText: {
    color: Colors.white,
    fontSize: 11,
    fontWeight: '700',
    marginTop: 2,
  },
});

export default SwipeableConversation;
