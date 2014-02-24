/*
 * Copyright 2013 Medical Research Council Harwell.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
package org.mousephenotype.dcc.visualise.entities;

import javax.xml.bind.annotation.XmlElement;

/**
 * The structure of the annotation data that is returned by the
 * AnnotationsFacadeREST web service.
 *
 * @author Gagarine Yaikhom <g.yaikhom@har.mrc.ac.uk>
 */
public class AnnotationData {

    private Long annotationId;
    private Double pvalueDouble;
    private String effectSize;
    private String standardError;
    private String maleMutantN;
    private String maleBaslineN;
    private String femaleMutantN;
    private String femaleBaslineN;
    private Integer zygosity;
    private Boolean success;
    private String yMP;
    private String yMP1;
    private MpDetails mp1;
    private MpDetails mp2;

    public AnnotationData(Long annotationId, Double pvalueDouble,
            String effectSize, String standardError,
            String maleMutantN, String maleBaslineN,
            String femaleMutantN, String femaleBaslineN,
            Integer zygosity, Boolean success,
            String yMP, String yMP1) {
        this.annotationId = annotationId;
        this.pvalueDouble = pvalueDouble;
        this.effectSize = effectSize;
        this.standardError = standardError;
        this.maleMutantN = maleMutantN;
        this.maleBaslineN = maleBaslineN;
        this.femaleMutantN = femaleMutantN;
        this.femaleBaslineN = femaleBaslineN;
        this.zygosity = zygosity;
        this.success = success;
        this.yMP = yMP;
        this.yMP1 = yMP1;
    }

    @XmlElement(name = "i")
    public Long getAnnotationId() {
        return annotationId;
    }

    public void setAnnotationId(Long annotationId) {
        this.annotationId = annotationId;
    }

    @XmlElement(name = "p")
    public Double getPvalueDouble() {
        return pvalueDouble;
    }

    public void setPvalueDouble(Double pvalueDouble) {
        this.pvalueDouble = pvalueDouble;
    }

    @XmlElement(name = "e")
    public String getEffectSize() {
        return effectSize;
    }

    public void setEffectSize(String effectSize) {
        this.effectSize = effectSize;
    }

    @XmlElement(name = "se")
    public String getStandardError() {
        return standardError;
    }

    public void setStandardError(String standardError) {
        this.standardError = standardError;
    }

    @XmlElement(name = "mm")
    public String getMaleMutantN() {
        return maleMutantN;
    }

    public void setMaleMutantN(String maleMutantN) {
        this.maleMutantN = maleMutantN;
    }

    @XmlElement(name = "mw")
    public String getMaleBaslineN() {
        return maleBaslineN;
    }

    public void setMaleBaslineN(String maleBaslineN) {
        this.maleBaslineN = maleBaslineN;
    }

    @XmlElement(name = "fm")
    public String getFemaleMutantN() {
        return femaleMutantN;
    }

    public void setFemaleMutantN(String femaleMutantN) {
        this.femaleMutantN = femaleMutantN;
    }

    @XmlElement(name = "fw")
    public String getFemaleBaslineN() {
        return femaleBaslineN;
    }

    public void setFemaleBaslineN(String femaleBaslineN) {
        this.femaleBaslineN = femaleBaslineN;
    }

    @XmlElement(name = "z")
    public Integer getZygosity() {
        return zygosity;
    }

    public void setZygosity(Integer zygosity) {
        this.zygosity = zygosity;
    }

    @XmlElement(name = "s")
    public Boolean getSuccess() {
        return success;
    }

    public void setSuccess(Boolean success) {
        this.success = success;
    }

    public String getyMP() {
        return yMP;
    }

    public void setyMP(String yMP) {
        this.yMP = yMP;
    }

    public String getyMP1() {
        return yMP1;
    }

    public void setyMP1(String yMP1) {
        this.yMP1 = yMP1;
    }

    @XmlElement(name = "mp1")
    public MpDetails getMp1() {
        return mp1;
    }

    public void setMp1(MpDetails mp1) {
        this.mp1 = mp1;
    }

    @XmlElement(name = "mp2")
    public MpDetails getMp2() {
        return mp2;
    }

    public void setMp2(MpDetails mp2) {
        this.mp2 = mp2;
    }
}
