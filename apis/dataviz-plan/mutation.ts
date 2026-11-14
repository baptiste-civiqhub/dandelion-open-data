import { useMutation } from '@tanstack/react-query'

import { postDatavizPlan } from './request'

export const usePostDatavizPlan = () => useMutation({ mutationFn: postDatavizPlan })
