import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, StatusBar } from 'react-native';

const languages = ['HTML', 'CSS', 'JavaScript', 'React'];

export default function EditorScreen() {
  const [activeTab, setActiveTab] = useState('HTML');
  const [htmlCode, setHtmlCode] = useState('<div>\n  <h1>Hello World</h1>\n  <p>Welcome to CreateStuff.ai</p>\n</div>');
  const [cssCode, setCssCode] = useState('body {\n  font-family: Arial;\n  background: #1a1a2e;\n  color: white;\n  padding: 20px;\n}');
  const [jsCode, setJsCode] = useState('document.querySelector("h1")\n  .addEventListener("click", () => {\n    alert("Clicked!");\n  });');

  const getCode = () => {
    switch (activeTab) {
      case 'HTML': return htmlCode;
      case 'CSS': return cssCode;
      case 'JavaScript': return jsCode;
      default: return '';
    }
  };

  const setCode = (code) => {
    switch (activeTab) {
      case 'HTML': setHtmlCode(code); break;
      case 'CSS': setCssCode(code); break;
      case 'JavaScript': setJsCode(code); break;
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1a1a2e" />
      <View style={styles.header}>
        <Text style={styles.title}>Code Editor</Text>
        <TouchableOpacity style={styles.runButton}>
          <Text style={styles.runButtonText}>▶ Run</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.tabBar}>
        {languages.map(lang => (
          <TouchableOpacity
            key={lang}
            style={[styles.tab, activeTab === lang && styles.activeTab]}
            onPress={() => setActiveTab(lang)}
          >
            <Text style={[styles.tabText, activeTab === lang && styles.activeTabText]}>
              {lang}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.editorContainer}>
        <View style={styles.lineNumbers}>
          {getCode().split('\n').map((_, i) => (
            <Text key={i} style={styles.lineNumber}>{i + 1}</Text>
          ))}
        </View>
        <TextInput
          style={styles.codeInput}
          value={getCode()}
          onChangeText={setCode}
          multiline
          selectionColor="#00d4ff"
          autoCapitalize="none"
        />
      </View>

      <View style={styles.toolbar}>
        <TouchableOpacity style={styles.toolButton}>
          <Text style={styles.toolButtonText}>Undo</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.toolButton}>
          <Text style={styles.toolButtonText}>Redo</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.toolButton}>
          <Text style={styles.toolButtonText}>Format</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.toolButton}>
          <Text style={styles.toolButtonText}>Save</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f23',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: '#1a1a2e',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#00d4ff',
  },
  runButton: {
    backgroundColor: '#00ff88',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 8,
  },
  runButtonText: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 14,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#16213e',
    paddingHorizontal: 8,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: '#00d4ff',
  },
  tabText: {
    color: '#666',
    fontSize: 14,
    fontWeight: '600',
  },
  activeTabText: {
    color: '#00d4ff',
  },
  editorContainer: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#0a0a1a',
  },
  lineNumbers: {
    width: 40,
    backgroundColor: '#0f0f23',
    paddingTop: 12,
    paddingHorizontal: 8,
  },
  lineNumber: {
    color: '#444',
    fontSize: 13,
    fontFamily: 'monospace',
    lineHeight: 20,
  },
  codeInput: {
    flex: 1,
    color: '#e0e0e0',
    fontSize: 13,
    fontFamily: 'monospace',
    padding: 12,
    lineHeight: 20,
    textAlignVertical: 'top',
  },
  toolbar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#1a1a2e',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#16213e',
  },
  toolButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  toolButtonText: {
    color: '#888',
    fontSize: 14,
  },
});
