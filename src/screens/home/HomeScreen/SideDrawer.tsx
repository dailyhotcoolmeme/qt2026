import React, { useCallback } from 'react'
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Modal,
  ScrollView,
  Alert,
} from 'react-native'
import { useAppTheme } from 'src/hooks/useAppTheme'
import { Image } from 'expo-image'
import { Ionicons } from '@expo/vector-icons'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { supabase } from 'src/lib/supabase'
import { useAuthStore } from 'src/stores/authStore'
import type { RootStackParamList } from 'src/navigation/types'

const ACCENT = '#4A6741'

type NavProp = NativeStackNavigationProp<RootStackParamList>

interface SideDrawerProps {
  visible: boolean
  onClose: () => void
}

export function SideDrawer({ visible, onClose }: SideDrawerProps) {
  const { isDark } = useAppTheme()
  const navigation = useNavigation<NavProp>()
  const { user, setSession, setUser } = useAuthStore()

  const bg = isDark ? '#1A1A1A' : '#FFFFFF'
  const textPrimary = isDark ? '#F5F5F5' : '#18181B'
  const textSecondary = isDark ? '#A1A1AA' : '#71717A'
  const borderColor = isDark ? '#2A2A2A' : '#F4F4F5'
  const itemHoverBg = isDark ? '#242424' : '#F9FAFB'

  const navigate = useCallback(
    (screen: keyof RootStackParamList) => {
      onClose()
      // @ts-ignore
      navigation.navigate(screen)
    },
    [onClose, navigation],
  )

  const handleLogout = useCallback(() => {
    Alert.alert('로그아웃', '로그아웃 하시겠습니까?', [
      { text: '취소', style: 'cancel' },
      {
        text: '로그아웃',
        style: 'destructive',
        onPress: async () => {
          await supabase.auth.signOut()
          setSession(null)
          setUser(null)
          onClose()
        },
      },
    ])
  }, [setSession, setUser, onClose])

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      {/* 배경 오버레이 */}
      <Pressable style={styles.overlay} onPress={onClose} />

      {/* 드로어 */}
      <View style={[styles.drawer, { backgroundColor: bg }]}>
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* 프로필 섹션 */}
          <View style={[styles.profileSection, { borderBottomColor: borderColor }]}>
            <View style={styles.profileTop}>
              {user?.user_metadata?.avatar_url ? (
                <Image
                  source={{ uri: user.user_metadata.avatar_url as string }}
                  style={styles.avatar}
                  contentFit="cover"
                />
              ) : (
                <View style={[styles.avatarPlaceholder, { backgroundColor: isDark ? '#2A2A2A' : '#F4F4F5' }]}>
                  <Ionicons name="person" size={28} color={textSecondary} />
                </View>
              )}
              <Pressable onPress={onClose} style={styles.closeBtn} hitSlop={8}>
                <Ionicons name="close" size={22} color={textSecondary} />
              </Pressable>
            </View>

            <View style={styles.profileInfo}>
              <Text style={[styles.profileName, { color: textPrimary }]}>
                {user?.user_metadata?.nickname as string || user?.email || '비로그인 상태'}
              </Text>
              {user?.email && (
                <Text style={[styles.profileEmail, { color: textSecondary }]}>
                  {user.email}
                </Text>
              )}
            </View>
          </View>

          {/* 메뉴 */}
          <View style={styles.menuSection}>
            <DrawerItem
              icon="bookmark-outline"
              label="내 기도제목함"
              onPress={() => navigate('MyPrayerBox')}
              bg={itemHoverBg}
              textColor={textPrimary}
              iconColor={textSecondary}
            />
            <DrawerItem
              icon="image-outline"
              label="말씀카드 보관함"
              onPress={() => navigate('RecordDetail' as keyof RootStackParamList)}
              bg={itemHoverBg}
              textColor={textPrimary}
              iconColor={textSecondary}
            />
            <DrawerItem
              icon="bookmark-outline"
              label="즐겨찾기 말씀"
              onPress={() => navigate('Favorites')}
              bg={itemHoverBg}
              textColor={textPrimary}
              iconColor={textSecondary}
            />
            <DrawerItem
              icon="settings-outline"
              label="설정"
              onPress={() => navigate('Settings')}
              bg={itemHoverBg}
              textColor={textPrimary}
              iconColor={textSecondary}
            />
          </View>

          {/* 로그인/로그아웃 */}
          <View style={[styles.authSection, { borderTopColor: borderColor }]}>
            {user ? (
              <DrawerItem
                icon="log-out-outline"
                label="로그아웃"
                onPress={handleLogout}
                bg={itemHoverBg}
                textColor="#EF4444"
                iconColor="#EF4444"
              />
            ) : (
              <DrawerItem
                icon="log-in-outline"
                label="로그인"
                onPress={() => navigate('Auth')}
                bg={itemHoverBg}
                textColor={ACCENT}
                iconColor={ACCENT}
              />
            )}
          </View>

          {/* 푸터 */}
          <Text style={[styles.footer, { color: isDark ? '#3F3F46' : '#D4D4D8' }]}>
            © 2026 아워마인. ALL RIGHTS RESERVED
          </Text>
        </ScrollView>
      </View>
    </Modal>
  )
}

function DrawerItem({
  icon,
  label,
  onPress,
  bg,
  textColor,
  iconColor,
}: {
  icon: string
  label: string
  onPress: () => void
  bg: string
  textColor: string
  iconColor: string
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.menuItem, pressed && { backgroundColor: bg }]}
    >
      <Ionicons name={icon as never} size={20} color={iconColor} />
      <Text style={[styles.menuLabel, { color: textColor }]}>{label}</Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  drawer: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 280,
    shadowColor: '#000',
    shadowOffset: { width: 4, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 16,
  },
  profileSection: {
    padding: 24,
    paddingTop: 56,
    borderBottomWidth: 1,
  },
  profileTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 16,
  },
  avatarPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtn: {
    padding: 4,
  },
  profileInfo: {
    gap: 4,
  },
  profileName: {
    fontSize: 16,
    fontWeight: '700',
  },
  profileEmail: {
    fontSize: 13,
  },
  menuSection: {
    padding: 12,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
  },
  menuLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  authSection: {
    padding: 12,
    borderTopWidth: 1,
  },
  footer: {
    fontSize: 11,
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
})
