import {test,expect} from '@playwright/test'

test('Beta starts with Plain Film, then Flow Wrap; other lock-outs remain',async({page})=>{
  const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message))
  await page.goto('/cutter.html?studio=home')
  await expect(page.getByRole('button',{name:'Create Plain Film cutter guide',exact:true})).toBeVisible()
  await expect(page.getByRole('button',{name:/Sandbox Mode/})).toHaveCount(0)
  await page.getByRole('button',{name:'Next pack type',exact:true}).click()
  await expect(page.getByRole('button',{name:'Create Flowwrap cutter guide',exact:true})).toBeVisible()
  await page.getByRole('button',{name:'Previous pack type',exact:true}).click()
  await page.getByRole('button',{name:'Create Plain Film cutter guide',exact:true}).click()
  await page.getByRole('button',{name:'Elements',exact:true}).click()
  await expect(page.getByRole('tab',{name:'Openings',exact:true})).toHaveCount(0)
  await expect(page.getByRole('tab',{name:'Die Cut Outs',exact:true})).toHaveCount(0)
  await page.getByRole('tab',{name:'Labels',exact:true}).click()
  await page.getByRole('button',{name:'Custom Label',exact:true}).click()
  await page.getByRole('textbox',{name:'Edit label text',exact:true}).fill('Beta Plain Film')
  await page.getByRole('textbox',{name:'Edit label text',exact:true}).press('Enter')
  await expect(page.locator('#preview-canvas text[data-text-key="label"]')).toHaveText('Beta Plain Film')
  await expect(page.locator('#kyza-qa-channel')).toHaveCount(0)
  expect(errors).toEqual([])
})

test('Beta retains direct-URL restrictions for excluded constructions and sandbox',async({page})=>{
  for(const query of ['studio=sandbox','packId=lidding','packId=plain-web','packId=plain-film&packId=2-side-seal-pouch']){
    await page.goto('/cutter.html?'+query)
    await expect(page.getByText('This pack type or feature is not included in the current Kyza beta. Your saved work has not been changed.',{exact:true}).first()).toBeVisible()
  }
})
