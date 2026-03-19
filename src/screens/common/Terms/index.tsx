import React from 'react'
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
} from 'react-native'
import { useAppTheme } from 'src/hooks/useAppTheme'
import { Pressable } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'

import { theme } from 'src/theme'
import type { RootStackParamList } from 'src/navigation/types'

type Props = NativeStackScreenProps<RootStackParamList, 'Terms'>

const SERVICE_TERMS = `제1조 (목적)
이 약관은 myamen(이하 "서비스")의 이용 조건 및 절차, 회사와 이용자 간의 권리·의무 및 책임사항을 규정함을 목적으로 합니다.

제2조 (정의)
1. "서비스"란 회사가 제공하는 기독교 신앙 앱 myamen 및 관련 제반 서비스를 의미합니다.
2. "이용자"란 서비스에 접속하여 이 약관에 따라 서비스를 이용하는 회원을 말합니다.

제3조 (약관의 효력 및 변경)
1. 이 약관은 서비스를 이용하고자 하는 모든 이용자에게 적용됩니다.
2. 회사는 필요한 경우 약관을 변경할 수 있으며, 변경된 약관은 앱 내 공지사항을 통해 안내됩니다.

제4조 (서비스의 제공)
1. 회사는 다음과 같은 서비스를 제공합니다.
   - 오늘의 말씀 및 QT(Quiet Time) 기록 서비스
   - 성경 읽기 플랜 및 진도 관리 서비스
   - 기도 제목 작성 및 공유 서비스
   - 커뮤니티 게시판 서비스
   - 그룹 관리 및 신앙 나눔 서비스

제5조 (이용자의 의무)
1. 이용자는 서비스 이용 시 다음 행위를 하여서는 안 됩니다.
   - 타인의 정보를 도용하거나 허위 정보를 등록하는 행위
   - 서비스를 이용하여 타인에게 불쾌감을 주거나 피해를 주는 행위
   - 종교적 혐오 발언 또는 타 종교를 비방하는 행위
   - 기타 관계 법령에 위반되는 행위

제6조 (서비스 이용 제한)
회사는 이용자가 본 약관의 의무를 위반하거나 서비스의 정상적인 운영을 방해하는 경우, 서비스 이용을 제한하거나 계정을 해지할 수 있습니다.

제7조 (책임 제한)
1. 회사는 천재지변, 전쟁, 기타 불가항력적 사유로 서비스를 제공할 수 없는 경우 책임이 면제됩니다.
2. 회사는 이용자의 귀책 사유로 인한 서비스 이용 장애에 대하여 책임을 지지 않습니다.

부칙
이 약관은 2024년 1월 1일부터 시행합니다.`

const PRIVACY_TERMS = `개인정보 처리방침

myamen(이하 "서비스")은 이용자의 개인정보를 소중히 여기며, 「개인정보 보호법」 및 관련 법령을 준수하여 개인정보를 처리합니다.

1. 수집하는 개인정보 항목
   - 필수 항목: 이메일 주소, 비밀번호
   - 선택 항목: 이름, 프로필 사진, 자기소개
   - 소셜 로그인: 구글, 카카오 계정 정보 (이메일, 닉네임)

2. 개인정보의 수집 목적
   - 회원 가입 및 서비스 제공
   - 본인 식별 및 인증
   - 서비스 이용 기록 관리
   - 고지사항 전달 및 불만 처리
   - 푸시 알림 발송

3. 개인정보의 보유 및 이용 기간
   - 회원 탈퇴 시까지 보유 및 이용
   - 탈퇴 후 30일 이내 파기
   - 법령에 따라 보존 필요 시 해당 기간 동안 보유

4. 개인정보의 제3자 제공
   - 원칙적으로 이용자의 개인정보를 외부에 제공하지 않습니다.
   - 법령의 규정에 의거하거나, 수사 목적으로 법령에 정해진 절차와 방법에 따라 수사기관의 요구가 있는 경우는 예외로 합니다.

5. 개인정보의 파기
   - 개인정보는 수집 및 이용 목적이 달성된 후에는 해당 정보를 지체 없이 파기합니다.
   - 전자적 파일 형태의 정보는 복구 불가능한 방법으로 영구 삭제합니다.

6. 이용자의 권리
   - 이용자는 언제든지 자신의 개인정보를 조회, 수정, 삭제할 수 있습니다.
   - 개인정보 처리 관련 요청은 앱 내 설정 메뉴 또는 이메일로 하실 수 있습니다.

7. 개인정보 보호책임자
   - 이메일: privacy@myamen.co.kr

8. 고지의 의무
   - 이 개인정보 처리방침은 2024년 1월 1일부터 시행됩니다.
   - 법령·정책 또는 보안 기술의 변경에 따라 내용이 변경될 수 있으며, 변경 시 앱 내 공지사항을 통해 안내합니다.`

const TITLE: Record<string, string> = {
  service: '서비스 이용약관',
  privacy: '개인정보 처리방침',
}

const CONTENT: Record<string, string> = {
  service: SERVICE_TERMS,
  privacy: PRIVACY_TERMS,
}

export default function TermsScreen({ navigation, route }: Props) {
  const { type } = route.params
  const insets = useSafeAreaInsets()
  const { isDark } = useAppTheme()
  const colorScheme = isDark ? 'dark' : 'light'
  const colors = theme.colors[colorScheme ?? 'light']
  const sp = theme.spacing

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* 헤더 */}
      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top,
            backgroundColor: colors.header,
            borderBottomColor: colors.headerBorder,
          },
        ]}
      >
        <Pressable
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          hitSlop={8}
        >
          <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
        </Pressable>

        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
          {TITLE[type]}
        </Text>

        {/* 오른쪽 균형 맞추기 */}
        <View style={styles.backBtn} />
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + sp.xl },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.bodyText, { color: colors.textPrimary }]}>
          {CONTENT[type]}
        </Text>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingBottom: theme.spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: {
    width: 36,
    padding: theme.spacing.xs,
    alignItems: 'center',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    ...theme.typography.styles.h4,
  },
  content: {
    padding: theme.spacing.screenPaddingH,
  },
  bodyText: {
    ...theme.typography.styles.body,
    lineHeight: 26,
  },
})
