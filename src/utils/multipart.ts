type MultipartFile = File | Blob | null | undefined

export function buildModelFormData<T>(
  model?: T | null,
  files: MultipartFile[] = [],
) {
  const formData = new FormData()

  if (model != null) {
    formData.append('model', new Blob([JSON.stringify(model)], { type: 'application/json' }))
  }

  files.forEach((file, index) => {
    if (!file) return
    const name = file instanceof File ? file.name : `file-${index + 1}`
    formData.append(name, file)
  })

  return formData
}

export function buildFileFormData(file: File, fieldName = 'file') {
  const formData = new FormData()
  formData.append(fieldName, file, file.name)
  return formData
}
