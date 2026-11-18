import { conflictDate } from '@/utils/conflict-date';
import { Text, View } from 'react-native';

import { ConflictComparison } from '@/components/conflict-comparison';
import type { Language } from '@/i18n/languages';
import { mergeEntryVersions, type EntryConflictVersion, type EntrySyncConflict } from '@/services/entry-sync-conflict';
import { currencyFractionDigits } from '@/utils/money';

const labels = {
  en: {
    local: 'On this device', server: 'On the server', unknown: 'Unknown editor', changed: 'Changed',
    missingBase: 'The original version is unavailable. Differences are shown without assigning them to either edit.',
    keepLocal: 'Apply my version', keepServer: 'Keep server version',
    deleted: 'Deleted on this device', remoteDeleted: 'Deleted on the server', copy: 'Create a new entry from my version', keepDeletion: 'Keep deletion', restore: 'Restore server version',
    failed: 'Could not resolve this conflict. Local changes are saved.',
    title: 'Title', amountMinor: 'Amount', dateTime: 'Date', description: 'Note', accountSyncId: 'Account', categorySyncId: 'Category',
  },
  ru: {
    local: 'На этом устройстве', server: 'На сервере', unknown: 'Автор неизвестен', changed: 'Изменено',
    missingBase: 'Исходная версия недоступна. Показаны различия между версиями.',
    keepLocal: 'Применить мою версию', keepServer: 'Оставить версию сервера',
    deleted: 'Удалено на этом устройстве', remoteDeleted: 'Удалено на сервере', copy: 'Создать запись из моей версии', keepDeletion: 'Подтвердить удаление', restore: 'Восстановить версию сервера',
    failed: 'Не удалось разрешить конфликт. Локальные изменения сохранены.',
    title: 'Название', amountMinor: 'Сумма', dateTime: 'Дата', description: 'Примечание', accountSyncId: 'Счёт', categorySyncId: 'Категория',
  },
  fi: {
    local: 'Tällä laitteella', server: 'Palvelimella', unknown: 'Tuntematon muokkaaja', changed: 'Muokattu',
    missingBase: 'Alkuperäistä versiota ei ole saatavilla. Versioiden erot näytetään.',
    keepLocal: 'Käytä omaa versiota', keepServer: 'Säilytä palvelimen versio',
    deleted: 'Poistettu tällä laitteella', remoteDeleted: 'Poistettu palvelimelta', copy: 'Luo uusi tapahtuma omasta versiosta', keepDeletion: 'Vahvista poisto', restore: 'Palauta palvelimen versio',
    failed: 'Ristiriitaa ei voitu ratkaista. Paikalliset muutokset on tallennettu.',
    title: 'Otsikko', amountMinor: 'Summa', dateTime: 'Päivä', description: 'Huomautus', accountSyncId: 'Tili', categorySyncId: 'Luokka',
  },
  fr: {
    local: "Sur cet appareil", server: "Sur le serveur", unknown: "Auteur inconnu", changed: "Modifié",
    missingBase: "La version d’origine est indisponible. Les différences sont affichées sans être attribuées à l’une des modifications.",
    keepLocal: "Appliquer ma version", keepServer: "Conserver la version du serveur",
    deleted: "Supprimé sur cet appareil", remoteDeleted: "Supprimé sur le serveur", copy: "Créer une opération à partir de ma version", keepDeletion: "Confirmer la suppression", restore: "Restaurer la version du serveur",
    failed: "Impossible de résoudre ce conflit. Les modifications locales sont enregistrées.",
    title: "Titre", amountMinor: "Montant", dateTime: "Date", description: "Note", accountSyncId: "Compte", categorySyncId: "Catégorie",
  },
  es: {
    local: "En este dispositivo", server: "En el servidor", unknown: "Autor desconocido", changed: "Modificado",
    missingBase: "La versión original no está disponible. Las diferencias se muestran sin atribuirlas a ninguna de las modificaciones.",
    keepLocal: "Aplicar mi versión", keepServer: "Conservar versión del servidor",
    deleted: "Eliminado en este dispositivo", remoteDeleted: "Eliminado en el servidor", copy: "Crear una operación a partir de mi versión", keepDeletion: "Confirmar eliminación", restore: "Restaurar versión del servidor",
    failed: "No se pudo resolver este conflicto. Los cambios locales están guardados.",
    title: "Título", amountMinor: "Importe", dateTime: "Fecha", description: "Nota", accountSyncId: "Cuenta", categorySyncId: "Categoría",
  },
 vi: {
    local: "Trên thiết bị này", server: "Trên máy chủ", unknown: "Không rõ người chỉnh sửa", changed: "Đã thay đổi",
    missingBase: "Không có phiên bản gốc. Các khác biệt được hiển thị mà không xác định thuộc về lần chỉnh sửa nào.",
    keepLocal: "Áp dụng bản của tôi", keepServer: "Giữ bản máy chủ",
    deleted: "Đã xóa trên thiết bị này", remoteDeleted: "Đã xóa trên máy chủ", copy: "Tạo giao dịch mới từ bản của tôi", keepDeletion: "Xác nhận xóa", restore: "Khôi phục bản máy chủ",
    failed: "Không thể giải quyết xung đột này. Thay đổi cục bộ đã được lưu.",
    title: "Tên giao dịch", amountMinor: "Số tiền", dateTime: "Ngày", description: "Ghi chú", accountSyncId: "Tài khoản", categorySyncId: "Danh mục",
  } };

const fields = ['title', 'amountMinor', 'dateTime', 'description', 'accountSyncId', 'categorySyncId'] as const;

function displayValue(
  value: EntryConflictVersion & { currencyCode?: string; accountName?: string; categoryName?: string },
  field: typeof fields[number],
  locale: string,
) {
  if (field === 'accountSyncId') return value.accountName ?? value.accountSyncId;
  if (field === 'categorySyncId') return value.categoryName ?? value.categorySyncId;
  if (field === 'amountMinor' && value.currencyCode) {
    return new Intl.NumberFormat(locale, { currency: value.currencyCode, style: 'currency' })
      .format(value.amountMinor / 10 ** currencyFractionDigits(value.currencyCode));
  }
  return value[field] ?? '—';
}

export function EntryConflictComparison({
  conflict, username, language, locale, color, onResolve,
}: {
  conflict: EntrySyncConflict;
  username: string;
  language: Language;
  locale: string;
  color: string;
  onResolve: (choice: 'server' | 'local') => Promise<void>;
}) {
  const text = labels[language];
  const { local, server, base, localDeleted } = conflict;
  const localPreview = mergeEntryVersions(conflict, 'local')?.merged;
  const serverPreview = mergeEntryVersions(conflict, 'server')?.merged;

  function enrich(value: EntryConflictVersion) {
    const account = value.accountSyncId === local.accountSyncId ? local : server;
    const category = value.categorySyncId === local.categorySyncId ? local : server;
    return { ...value, currencyCode: account?.currencyCode,
      accountName: account?.accountName, categoryName: category?.categoryName };
  }
  const left = localPreview ? enrich(localPreview) : local;
  const right = serverPreview ? enrich(serverPreview) : server;
  const different = fields.filter((field) => localDeleted || !right || left[field] !== right[field]);
  const dates = [...new Set([local.dateTime, server?.dateTime].filter(Boolean)
    .map((date) => conflictDate(date, locale)))].join(' / ');
  return (
    <View style={{ gap: 12 }}>
      <ConflictComparison language={language} color={color} title={`${local.type === 'EXPENSE'
          ? { en: 'Expense', ru: 'Расход', fi: 'Meno' , fr: "Dépense", es: "Gasto" , vi: "Khoản chi" }[language]
          : { en: 'Income', ru: 'Доход', fi: 'Tulo' , fr: "Revenus", es: "Ingresos" , vi: "Thu nhập" }[language]} · ${local.title} · ${dates}`}
        localInfo={`${username}${localDeleted ? ` · ${text.deleted}` : ''}`}
        serverInfo={server ? server.editor ?? text.unknown : text.remoteDeleted}
        rows={different.map((field) => ({
          label: text[field],
          local: localDeleted ? '—' : displayValue(left, field, locale),
          server: right ? displayValue(right, field, locale) : '—',
        }))}
        canKeepLocal={Boolean(server || !localDeleted)} onResolve={onResolve} />
      {server && !base && !localDeleted && <Text style={{ color }}>{text.missingBase}</Text>}
      {!server && <Text style={{ color }}>{text.copy}</Text>}
    </View>
  );
}
