<script setup>
import {ref,onMounted,onBeforeUnmount,watch} from 'vue'
import '@toast-ui/editor/dist/toastui-editor.css'
const props=defineProps({modelValue:String}),emit=defineEmits(['update:modelValue'])
const host=ref(null),error=ref('');let editor,stopped=false,syncing=false
onMounted(async()=>{try{const {default:Editor}=await import('@toast-ui/editor');if(stopped)return;editor=new Editor({el:host.value,height:'560px',initialEditType:'wysiwyg',initialValue:props.modelValue||'',usageStatistics:false,hideModeSwitch:true,toolbarItems:[['heading','bold','italic','strike'],['hr','quote'],['ul','ol','task'],['table','link'],['code','codeblock']],events:{change:()=>{if(editor&&!syncing)emit('update:modelValue',editor.getMarkdown())}}})}catch{error.value='文档编辑器加载失败，请使用 Markdown 编辑。'}})
watch(()=>props.modelValue,value=>{if(editor&&editor.getMarkdown()!==value){syncing=true;editor.setMarkdown(value||'',false);syncing=false}})
onBeforeUnmount(()=>{stopped=true;editor?.destroy()})
</script>
<template><div class="visual-document"><p>像编辑文档一样设置标题、加粗、列表、链接和表格。页面字段在上方填写；特殊组件请使用 Markdown 模式。</p><p v-if="error" role="alert">{{error}}</p><div ref="host" aria-label="文档正文编辑器"></div></div></template>
<style scoped>.visual-document{background:white;color:#222;padding:12px;border-radius:8px}.visual-document :deep(.toastui-editor-contents){font-size:16px}.visual-document :deep(.toastui-editor-defaultUI){max-width:100%}</style>
