<script setup>
import {ref,onMounted,onBeforeUnmount,watch} from 'vue'
import '@toast-ui/editor/dist/toastui-editor.css'
const props=defineProps({modelValue:String}),emit=defineEmits(['update:modelValue'])
const host=ref(null),error=ref('');let editor,stopped=false,syncing=false
onMounted(async()=>{try{const {default:Editor}=await import('@toast-ui/editor');await import('@toast-ui/editor/dist/i18n/zh-cn');if(stopped)return;editor=new Editor({el:host.value,height:'auto',minHeight:'calc(100vh - 330px)' ,initialEditType:'wysiwyg',initialValue:props.modelValue||'',usageStatistics:false,hideModeSwitch:true,language:'zh-CN',toolbarItems:[['heading','bold','italic','strike'],['hr','quote'],['ul','ol','task'],['table','image','link'],['code','codeblock']],events:{change:()=>{if(editor&&!syncing)emit('update:modelValue',editor.getMarkdown())}}})}catch{error.value='文档编辑器加载失败，请使用 Markdown 编辑。'}})
watch(()=>props.modelValue,value=>{if(editor&&editor.getMarkdown()!==value){syncing=true;editor.setMarkdown(value||'',false);syncing=false}})
onBeforeUnmount(()=>{stopped=true;editor?.destroy()})
</script>
<template><div class="visual-document"><p v-if="error" role="alert">{{error}}</p><div ref="host" aria-label="文档正文编辑器"></div></div></template>
<style scoped>.visual-document{background:white;color:#222;padding:0;border-radius:5px}.visual-document :deep(.toastui-editor-contents){font-size:16px;line-height:1.85}.visual-document :deep(.toastui-editor-defaultUI){max-width:100%}.visual-document :deep(.toastui-editor-defaultUI-toolbar){max-width:100%;overflow-x:auto}.visual-document :deep(.toastui-editor-toolbar-group){flex-shrink:0}</style>
