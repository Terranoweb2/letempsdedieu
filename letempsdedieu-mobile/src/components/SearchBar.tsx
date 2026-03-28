import React, { useState, useEffect, useRef } from 'react';
import { View, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../theme/colors';

interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
}

export const SearchBar: React.FC<SearchBarProps> = ({ value, onChangeText }) => {
  const [localValue, setLocalValue] = useState(value);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const handleChangeText = (text: string) => {
    setLocalValue(text);
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    timerRef.current = setTimeout(() => {
      onChangeText(text);
    }, 300);
  };

  const handleClear = () => {
    setLocalValue('');
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    onChangeText('');
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  return (
    <View style={styles.container}>
      <Ionicons
        name="search-outline"
        size={18}
        color={Colors.gray500}
        style={styles.searchIcon}
      />
      <TextInput
        style={styles.input}
        value={localValue}
        onChangeText={handleChangeText}
        placeholder="Rechercher une conversation..."
        placeholderTextColor={Colors.gray600}
        selectionColor={Colors.teal500}
      />
      {localValue.length > 0 && (
        <TouchableOpacity onPress={handleClear} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="close-circle" size={18} color={Colors.gray500} />
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.navy800,
    borderWidth: 1,
    borderColor: Colors.whiteBorder10,
    borderRadius: 10,
    marginHorizontal: 12,
    marginBottom: 8,
    paddingHorizontal: 12,
    height: 40,
  },
  searchIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    color: Colors.gray200,
    fontSize: 14,
    paddingVertical: 0,
  },
});
