import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { WebView } from 'react-native-webview';

import { markets } from '../config/markets';
import { detectLogin } from '../lib/loginDetect';
import { buildProbeScript } from '../lib/loginProbe';

// The probe script (lib/loginProbe.js) carries the privacy contract: it never
// reads, requests, stores or logs a password, never captures keystrokes and
// never reads form values. It only observes navigation URLs and page structure.
// It runs via injectedJavaScript in the page's own origin (no cross-origin
// access); results come back through onMessage as JSON.

function StatusBadge({ status }) {
  const connected = status && status.connected === true;
  return (
    <View style={styles.badgeWrap}>
      <View style={[styles.badge, connected ? styles.badgeOk : styles.badgeOff]}>
        <Text style={[styles.badgeText, connected ? styles.badgeTextOk : styles.badgeTextOff]}>
          {connected ? 'Connected ✓' : 'Needs account'}
        </Text>
      </View>
      <Text style={styles.reasonLine}>reason: {(status && status.reason) || 'unknown'}</Text>
    </View>
  );
}

export default function ConnectScreen() {
  // marketId -> { connected, reason }. Unprobed markets read as unknown/not connected.
  const [statuses, setStatuses] = useState({});
  const [active, setActive] = useState(null);
  const [probe, setProbe] = useState(null);

  const webRef = useRef(null);
  const activeRef = useRef(null);

  useEffect(() => {
    activeRef.current = active;
  }, [active]);

  const closeWebView = useCallback(() => {
    activeRef.current = null;
    setActive(null);
    setProbe(null);
  }, []);

  const handleOpen = useCallback((market) => {
    setProbe(null);
    activeRef.current = market;
    setActive(market);
  }, []);

  const handleMessage = useCallback((event) => {
    let msg;
    try {
      msg = JSON.parse(event.nativeEvent.data);
    } catch (e) {
      return;
    }
    if (!msg || msg.type !== 'login-probe') return;
    const market = activeRef.current;
    if (!market || msg.marketId !== market.id) return; // stale probe from a closed modal

    const result = detectLogin({
      requestedPath: msg.requestedPath,
      finalPath: msg.finalPath,
      signals: msg.signals,
    });
    setStatuses((prev) => ({ ...prev, [market.id]: result }));
    setProbe(result);
    if (result.connected) closeWebView();
  }, [closeWebView]);

  // Re-probe periodically so SPA-only state changes (login modal, client-side
  // redirects) are picked up even when no full page load happens.
  useEffect(() => {
    if (!active) return undefined;
    const script = buildProbeScript(active);
    const timer = setInterval(() => {
      const view = webRef.current;
      if (view && typeof view.injectJavaScript === 'function') {
        view.injectJavaScript(script);
      }
    }, 2500);
    return () => clearInterval(timer);
  }, [active]);

  const script = active ? buildProbeScript(active) : '';

  return (
    <View style={styles.container}>
      <View style={styles.intro}>
        <Text style={styles.introTitle}>Connect your marketplaces</Text>
        <Text style={styles.introBody}>
          Sign-in happens on each marketplace's own page. This app never reads or stores
          passwords - it only checks whether a signed-in session is already present.
        </Text>
      </View>

      <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
        {markets.map((market) => {
          const status = statuses[market.id] || { connected: false, reason: 'unknown' };
          return (
            <View key={market.id} style={styles.card}>
              <View style={styles.cardTop}>
                <View style={styles.cardInfo}>
                  <Text style={styles.marketName}>{market.name}</Text>
                  <Text style={styles.marketOrigin}>{market.origin}</Text>
                </View>
                <StatusBadge status={status} />
              </View>
              <TouchableOpacity
                style={styles.connectBtn}
                onPress={() => handleOpen(market)}
                accessibilityRole="button"
              >
                <Text style={styles.connectText}>Connect {market.name}</Text>
              </TouchableOpacity>
            </View>
          );
        })}
        <View style={{ height: 30 }} />
      </ScrollView>

      <Modal
        visible={active !== null}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={closeWebView}
      >
        <View style={styles.modal}>
          <View style={styles.modalBar}>
            <Text style={styles.modalTitle} numberOfLines={1}>
              {active ? active.name : ''}
            </Text>
            <View style={styles.modalStatus}>
              <Text style={styles.modalStatusText}>
                {probe ? 'reason: ' + probe.reason : 'probing...'}
              </Text>
            </View>
            <TouchableOpacity style={styles.doneBtn} onPress={closeWebView} accessibilityRole="button">
              <Text style={styles.doneText}>Done</Text>
            </TouchableOpacity>
          </View>

          {active ? (
            <WebView
              ref={webRef}
              style={styles.webview}
              source={{ uri: active.createUrl }}
              originWhitelist={['https://*', 'http://*']}
              injectedJavaScript={script}
              onMessage={handleMessage}
              javaScriptEnabled
              domStorageEnabled
              startInLoadingState
              renderLoading={() => (
                <View style={styles.loader}>
                  <ActivityIndicator size="large" color="#E91E63" />
                </View>
              )}
            />
          ) : (
            <View style={styles.loader} />
          )}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f23' },
  intro: { paddingHorizontal: 20, paddingTop: 18, paddingBottom: 6 },
  introTitle: { fontSize: 18, fontWeight: 'bold', color: '#fff' },
  introBody: { fontSize: 13, color: '#888', marginTop: 8, lineHeight: 19 },
  list: { flex: 1, paddingHorizontal: 16, paddingTop: 8 },
  card: {
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  cardInfo: { flex: 1, paddingRight: 12 },
  marketName: { fontSize: 16, fontWeight: '600', color: '#fff' },
  marketOrigin: { fontSize: 12, color: '#666', marginTop: 4 },
  badgeWrap: { alignItems: 'flex-end' },
  badge: {
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
    overflow: 'hidden',
  },
  badgeOk: { backgroundColor: '#4CAF5022' },
  badgeOff: { backgroundColor: '#66666622' },
  badgeText: { fontSize: 12, fontWeight: '700' },
  badgeTextOk: { color: '#4CAF50' },
  badgeTextOff: { color: '#999' },
  reasonLine: { fontSize: 10, color: '#555', marginTop: 5 },
  connectBtn: {
    marginTop: 14,
    borderWidth: 1,
    borderColor: '#E91E63',
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: 'center',
  },
  connectText: { color: '#E91E63', fontSize: 14, fontWeight: '600' },
  modal: { flex: 1, backgroundColor: '#0f0f23' },
  modalBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: '#1a1a2e',
  },
  modalTitle: { color: '#fff', fontSize: 15, fontWeight: '700', flexShrink: 1 },
  modalStatus: { flex: 1, alignItems: 'center' },
  modalStatusText: { color: '#666', fontSize: 11 },
  doneBtn: {
    backgroundColor: '#E91E63',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  doneText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  webview: { flex: 1, backgroundColor: '#fff' },
  loader: {
    flex: 1,
    backgroundColor: '#0f0f23',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
